# Implementation Plan: Roles, Dashboards y Logística de Entregas

**Branch**: `002-roles-logistica-entregas` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-roles-logistica-entregas/spec.md`

## Summary

Amplía el portal (feature 1) con un sistema logístico autónomo "tipo app de delivery": un
nuevo rol de **personal de apoyo** (repartidores/transportistas) que se registra con cédula +
foto (cifradas), toma **órdenes de entrega** disponibles, recoge los recursos en el donante y
los entrega al necesitado confirmando con **códigos de un solo uso**, con **rastreo GPS en
vivo** hacia las partes, **incidencias** documentadas con foto/video, **dashboards** para
donantes y necesitados (distancias, más solicitados, ETA), **reputación** con valoración mutua
y suspensión automática, y **catálogos configurables** de roles y tipos de recurso (incluidos
recursos humanos con flujo híbrido). Añade **R2** para medios y almacenamiento **cifrado** de
datos sensibles (cédula y ubicación exacta), conservando los principios de la constitución.

## Technical Context

**Language/Version**: TypeScript 5.x (Worker y frontend); Node.js 20 (tooling). Continúa el
stack de la feature 1.

**Primary Dependencies**:
- Backend: Hono, Durable Objects (WebSocket Hibernation), D1, KV, **R2** (medios), Zod,
  WebCrypto (AES-GCM para cifrado de cédula y ubicación exacta), worker-mailer (ya integrado).
- Frontend: Vite + React + TS; Leaflet (mapa, ya existente) reutilizado para selección de
  punto exacto y para mostrar rastreo en vivo; captura de cámara para foto/video (input
  `capture`); geolocalización en vivo del transportista.

**Storage**:
- D1: personal de apoyo, roles, órdenes de entrega, valoraciones/reputación, incidencias,
  referencias a medios, ubicación exacta cifrada (cédula y coordenadas).
- R2: archivos de medios (fotos/videos de incidencias y prueba de entrega) y foto de cédula
  (cifrada en aplicación antes de subir). Buckets privados; servidos solo vía Worker con
  control de acceso.
- Durable Objects: "DeliveryRoom" por orden activa (claim exclusivo + rastreo en vivo +
  difusión de estado a las partes); reutiliza el patrón realtime de la feature 1.
- KV: catálogos configurables (roles de apoyo, tipos de recurso) y parámetros (umbrales de
  reputación, límites de medios, velocidad media para ETA).

**Testing**: Vitest + `@cloudflare/vitest-pool-workers` (rutas, D1, DO, R2 con bindings de
test); Playwright (e2e de los flujos críticos: tomar orden, confirmar con código, dashboards,
reporte de incidencia, viewport móvil).

**Target Platform**: Edge (Cloudflare Workers/Pages). Clientes móviles (mobile-first) con
cámara y GPS; degradación elegante sin GPS/cámara.

**Project Type**: Web application (extiende el backend Worker y el frontend Pages de feature 1).

**Performance Goals**:
- Cambios de estado de orden visibles a las partes en ≤5 s (SC-003).
- Rastreo en vivo actualizado ≥ cada 30 s durante entrega activa (SC-007).
- Dashboards (donante/necesitado) útiles en ≤3 s en 3G (SC-004).
- Subida de medios con límites (foto ≤5 MB, video ≤15 s/≤25 MB) sin bloquear la UI.

**Constraints**:
- Cloudflare-only (Workers + Pages + D1 + DO + KV + **R2**); costo mínimo.
- Privacidad por diseño: cédula y ubicación exacta **cifradas (AES-GCM)**, nunca públicas;
  exacta revelada solo al transportista asignado; rastreo preciso solo a las partes; medios
  privados con acceso controlado; retención de evidencias 90 días.
- Mobile-first, español, WCAG 2.1 AA.
- Sistema autónomo: sin operador central que apruebe entregas; anti-abuso por reputación.

**Scale/Scope**: Cobertura nacional (Venezuela). 8 historias de usuario; ~10 entidades nuevas;
añade R2 y un nuevo tipo de Durable Object.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Puerta | Estado |
|-----------|--------|--------|
| I. Dignidad y Protección | Cédula y ubicación exacta **cifradas** (AES-GCM), nunca públicas; exacta solo al transportista asignado; cédula solo auditoría ante disputa (FR-003); rastreo preciso solo a las partes; medios privados; retención 90 d; minimización mantenida | ✅ PASS (sensibilidad elevada gestionada por cifrado + acceso restringido) |
| II. Acceso Directo Sin Intermediarios | Los transportistas son ayuda **opcional y gratuita**, no un peaje ni un aprobador: el donante puede seguir auto-entregando (feature 1); sin comisiones; sin operador central | ✅ PASS (intermediario no obligatorio) |
| III. Mobile-First / Baja Conectividad | Tomar órdenes, dashboards, cámara y GPS mobile-first; degradación sin GPS/cámara; español; WCAG AA | ✅ PASS |
| IV. Confianza, Veracidad y Tiempo Real | Estados/rastreo realtime (DO); confirmación por códigos; incidencias con evidencia; reputación + suspensión automática; auditoría sin datos personales | ✅ PASS |
| V. Abierto, Público y Gratuito | Gratis para todos los roles; sin comisiones; código abierto; mapa público sin login | ✅ PASS |
| Restricciones de Plataforma | Cloudflare Workers + Pages + D1 + DO + KV + R2; edge-first; costo mínimo | ✅ PASS (R2 dentro de niveles gratuitos previstos) |
| Interacción del Asistente | Decisiones del usuario resueltas por interfaz estructurada (clarify) | ✅ PASS |

**Resultado**: Sin violaciones. La mayor sensibilidad de datos (cédula, ubicación exacta) se
gestiona con cifrado de aplicación, acceso mínimo y retención acotada — coherente con el
Principio I. No se requiere Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-roles-logistica-entregas/
├── plan.md              # Este archivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1
│   ├── rest-api.md       # Endpoints REST nuevos (roles, órdenes, dashboards, incidencias, medios)
│   └── realtime-ws.md    # WebSocket de la DeliveryRoom (estado de orden + rastreo en vivo)
└── tasks.md             # Fase 2 (/speckit-tasks)
```

### Source Code (repository root) — extiende feature 1

```text
backend/
├── src/
│   ├── routes/
│   │   ├── support.ts            # Registro/gestión de personal de apoyo (cédula cifrada)
│   │   ├── orders.ts             # Órdenes de entrega: publicar, listar, tomar, estados, códigos
│   │   ├── incidents.ts          # Reporte de incidencias + evidencia
│   │   ├── media.ts              # Subida/descarga controlada de medios (R2)
│   │   ├── dashboards.ts         # Dashboards donante/necesitado (agregados, distancia, ETA)
│   │   └── ratings.ts            # Valoraciones y reputación
│   ├── do/
│   │   ├── map-room.ts           # (existente) realtime del mapa
│   │   └── delivery-room.ts      # NUEVO: claim exclusivo de orden + rastreo en vivo + difusión
│   ├── domain/
│   │   ├── order-state.ts        # Máquina de estados de orden
│   │   ├── reputation.ts         # Cálculo de reputación + reglas de suspensión
│   │   ├── eta.ts                # Estimación de llegada (haversine + velocidad media)
│   │   ├── roles.ts              # Catálogo de roles de apoyo (KV)
│   │   └── resource-types.ts     # Catálogo de tipos de recurso (transportable vs humano)
│   ├── lib/
│   │   ├── encryption.ts         # AES-GCM (cédula, ubicación exacta) con clave de secret
│   │   ├── r2.ts                 # Helpers de subida/descarga y validación de medios
│   │   └── codes.ts              # Generación/verificación de códigos de un solo uso
│   └── db/
│       └── queries.ts            # (extendido) consultas de órdenes, reputación, dashboards
├── migrations/
│   ├── 0001_init.sql             # (existente)
│   └── 0002_logistica.sql        # NUEVO: tablas de apoyo, órdenes, valoraciones, incidencias,
│                                 #        medios, y columnas de ubicación exacta cifrada en need
└── wrangler.jsonc                # + binding R2, + Durable Object DeliveryRoom, + secrets cifrado

web/
├── src/
│   ├── pages/
│   │   ├── SupportSignupPage.tsx   # Registro de personal de apoyo
│   │   ├── OrdersPage.tsx          # Órdenes disponibles + tomar (tipo delivery)
│   │   ├── OrderDetailPage.tsx     # Flujo de una orden: recogida/entrega/códigos/incidencias
│   │   ├── DonorDashboardPage.tsx  # Dashboard del donante
│   │   └── RecipientDashboardPage.tsx # Dashboard del necesitado (ETA, rastreo)
│   ├── components/
│   │   ├── MediaCapture.tsx        # Captura de foto/video (cámara) con validación de tamaño
│   │   ├── LiveTrackMap.tsx        # Mapa con la ubicación en vivo del transportista
│   │   ├── CodeEntry.tsx           # Ingreso de códigos de recogida/entrega
│   │   └── Reputation.tsx          # Estrellas/valoración
│   ├── hooks/
│   │   ├── useDeliveryRealtime.ts  # WS de la DeliveryRoom (estado + ubicación en vivo)
│   │   └── useLivePosition.ts      # Geolocalización en vivo del transportista (watchPosition)
│   └── lib/
│       └── api.ts                  # (extendido) endpoints nuevos
└── tests/e2e/                      # flujos de orden, dashboards, incidencias
```

**Structure Decision**: Extiende los dos despliegues de la feature 1 (Worker + Pages). Se
añade **R2** para medios y un segundo Durable Object (**DeliveryRoom**) para la coordinación
exclusiva de cada orden y el rastreo en vivo hacia las partes. El cifrado de datos sensibles
(cédula, ubicación exacta) se hace en la capa de aplicación (AES-GCM) con clave en *secret*,
de modo que ni el almacenamiento ni la API pública exponen el dato en claro.

## Complexity Tracking

> No aplica: la verificación de la constitución no arrojó violaciones que requieran
> justificación. El uso de transportistas (intermediario opcional) y el almacenamiento de
> datos sensibles (cifrado, mínimo, retención acotada) se mantienen dentro de los principios.
