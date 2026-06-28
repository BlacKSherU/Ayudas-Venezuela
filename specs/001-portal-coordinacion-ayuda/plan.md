# Implementation Plan: Portal de Coordinación de Ayuda

**Branch**: `001-portal-coordinacion-ayuda` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-portal-coordinacion-ayuda/spec.md`

## Summary

Portal humanitario público y gratuito que conecta donantes con personas necesitadas tras
el terremoto en Venezuela, sin intermediarios. La pieza central es un **mapa interactivo
real en tiempo real**: las necesidades aparecen como puntos/zonas en el mapa y se actualizan
en vivo (≤5 s) para todas las personas conectadas. Enfoque técnico: frontend mobile-first
en **Cloudflare Pages** (Vite + React + Leaflet tras una capa de abstracción `MapEngine`),
y backend en un **Cloudflare Worker** (Hono) con **D1** para persistencia, **Durable
Objects** (WebSocket Hibernation) para el tiempo real, y **KV** para catálogo/configuración.
La privacidad se garantiza por diseño: ubicación pública ofuscada por zona, contacto público
solo si la persona opta por subirlo.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend y Worker); Node.js 20 LTS solo para tooling.

**Primary Dependencies**:
- Backend: Hono (router en el Worker), Durable Objects (WebSocket Hibernation API), D1
  (SQLite), KV. Zod para validación. Cloudflare Email (OTP de identidad ligera).
- Frontend: Vite + React 18 + TypeScript; Leaflet + tiles raster de OpenStreetMap, detrás
  de una abstracción `MapEngine` (permite migrar a MapLibre GL vectorial sin reescribir la
  app). Sin librería de estado pesada (Context + hooks).

**Storage**:
- D1 (SQLite): necesidades, identidades ligeras, compromisos, registro de auditoría,
  reportes anti-abuso.
- Durable Objects: coordinación de tiempo real y difusión de eventos del mapa (sharding por
  estado/región de Venezuela).
- KV: catálogo de tipos de insumo y configuración (TTLs, límites de tasa).
- R2: fuera de alcance del MVP (sin fotos en v1).

**Testing**: Vitest (unit) + `@cloudflare/vitest-pool-workers` (integración sobre Workers,
D1 y DO en `workerd`); Playwright (e2e del mapa y flujos críticos, incluyendo viewport
móvil y degradación sin geolocalización).

**Target Platform**: Edge (Cloudflare Workers/Pages). Clientes: navegadores móviles modernos
(mobile-first), con degradación elegante en redes lentas (3G) y sin permiso de geolocalización.

**Project Type**: Web application (frontend en Pages + backend Worker con Durable Objects).

**Performance Goals**:
- Nuevas necesidades / cambios de estado visibles en otros clientes en ≤5 s (SC-003).
- Interacción útil de páginas críticas (publicar, mapa) en ≤3 s en 3G (SC-004).
- Presupuesto de bundle inicial (shell + mapa diferido) ≤ ~150 KB gzip; el mapa se carga de
  forma diferida (code-splitting) para no penalizar el primer pintado.
- Soportar ≥10.000 clientes concurrentes consultando el mapa (SC-007) mediante sharding de
  Durable Objects por región y difusión filtrada por viewport.

**Constraints**:
- Despliegue obligatorio en Cloudflare (Workers + Pages) con storage de Cloudflare.
- Privacidad por diseño: la API pública nunca expone dirección exacta; coordenadas públicas
  ofuscadas a una rejilla/zona (~1 km). Contacto público solo si la persona lo sube.
- Interfaz y contenido en español; accesibilidad objetivo WCAG 2.1 AA.
- Gratuito y de código abierto; sin muro de inicio de sesión para ver el mapa (FR-009).
- Operación a costo mínimo (preferir niveles gratuitos de Cloudflare).

**Scale/Scope**: Cobertura nacional de Venezuela; MVP de 4 historias de usuario (publicar
necesidad, explorar mapa en vivo, comprometerse, confirmar entrega). ~6 entidades de datos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Puerta | Estado |
|-----------|--------|--------|
| I. Dignidad y Protección | API pública sin dirección exacta; coordenadas ofuscadas por zona; datos personales minimizados; contacto público solo opt-in con aviso; borrado/edición de datos propios | ✅ PASS (por diseño) |
| II. Acceso Directo Sin Intermediarios | Flujo donante→necesitado sin aprobación central por entrega; sin comisiones; emparejamiento por proximidad | ✅ PASS |
| III. Mobile-First / Baja Conectividad | Mobile-first; Leaflet raster ligero; mapa diferido; presupuesto 3G; WCAG 2.1 AA; español; degradación sin geo/mapa | ✅ PASS |
| IV. Confianza, Veracidad y Tiempo Real | Realtime vía Durable Objects (≤5 s); estados auditables sin exponer datos; anti-abuso (rate limit, dedupe, reportes); auto-liberar 12 h; expirar 30 d | ✅ PASS |
| V. Abierto, Público y Gratuito | Licencia open source; gratis; mapa visible sin login; identidad ligera solo para gestionar las propias publicaciones | ✅ PASS |
| Restricciones de Plataforma | Cloudflare Workers + Pages + D1 + Durable Objects + KV; edge-first; WebSockets sobre DO; costo mínimo | ✅ PASS |
| Interacción del Asistente | Las decisiones del usuario se piden por interfaz estructurada (motor de mapa ya resuelto así) | ✅ PASS |

**Resultado**: Sin violaciones. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-portal-coordinacion-ayuda/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── rest-api.md       # Contrato HTTP (REST) del Worker
│   └── realtime-ws.md    # Contrato WebSocket de tiempo real (Durable Object)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
backend/                          # Cloudflare Worker (API + tiempo real)
├── src/
│   ├── index.ts                  # Entry: Hono app, enrutado, binding a DO/D1/KV
│   ├── routes/                   # Handlers REST (needs, commitments, identity, reports)
│   │   ├── needs.ts
│   │   ├── commitments.ts
│   │   ├── identity.ts
│   │   └── reports.ts
│   ├── do/
│   │   └── map-room.ts           # Durable Object: WebSocket Hibernation + difusión
│   ├── domain/
│   │   ├── need-state.ts         # Máquina de estados (pendiente→comprometida→entregada)
│   │   ├── geo.ts                # Ofuscación de coordenadas a zona (rejilla ~1km)
│   │   └── categories.ts         # Catálogo de insumos
│   ├── lib/
│   │   ├── auth.ts               # Identidad ligera (OTP), sesión por cookie firmada
│   │   ├── ratelimit.ts          # Límites de tasa anti-abuso
│   │   ├── dedupe.ts             # Detección de duplicados
│   │   └── audit.ts              # Registro de auditoría de cambios de estado
│   └── db/
│       └── queries.ts            # Acceso a D1 (consultas por bounding box, estados)
├── migrations/                   # Migraciones SQL de D1
│   └── 0001_init.sql
├── wrangler.jsonc                # Config Worker: bindings D1/DO/KV, rutas
└── tests/
    ├── unit/                     # geo, state machine, dedupe, ratelimit
    └── integration/              # rutas + D1 + DO con vitest-pool-workers

web/                              # Frontend (Cloudflare Pages, Vite + React)
├── src/
│   ├── main.tsx
│   ├── pages/                    # Mapa (home), Publicar necesidad, Mis publicaciones
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapEngine.ts      # Abstracción del motor (impl. Leaflet; futura MapLibre)
│   │   │   ├── LeafletEngine.ts  # Implementación Leaflet + OSM raster
│   │   │   └── NeedsLayer.tsx    # Capa de marcadores/zonas de necesidades
│   │   ├── NeedForm.tsx
│   │   ├── NeedList.tsx          # Fallback/lista accesible de necesidades
│   │   └── Filters.tsx           # Filtro por tipo de insumo y urgencia
│   ├── hooks/
│   │   ├── useRealtime.ts        # Cliente WebSocket (reconexión, viewport)
│   │   └── useGeolocation.ts     # Geolocalización con degradación elegante
│   └── lib/
│       └── api.ts                # Cliente REST tipado
├── public/
├── index.html
├── vite.config.ts
└── tests/e2e/                    # Playwright: mapa, publicar, realtime, móvil

package.json                      # Workspaces (backend, web) o scripts raíz
```

**Structure Decision**: Aplicación web con dos despliegues Cloudflare separados que reflejan
la restricción de la constitución ("Workers y Pages"): el **frontend** se construye con Vite
y se publica en **Cloudflare Pages**; el **backend** (API REST + Durable Object de tiempo
real + D1/KV) se publica como **Cloudflare Worker** y se comunica con el frontend vía
HTTPS/WSS. El mapa vive tras una abstracción `MapEngine` para empezar con Leaflet+OSM
(ligero, 3G) y poder migrar a MapLibre vectorial sin reescribir la aplicación.

## Complexity Tracking

> No aplica: la verificación de la constitución no arrojó violaciones que requieran
> justificación.
