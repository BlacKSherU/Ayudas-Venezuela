# Implementation Plan: Secciones, Roles y Login Único

**Branch**: `004-secciones-roles-login` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-secciones-roles-login/spec.md`

## Summary

Reorganiza la app (sobre todo **frontend**) en **cuatro secciones** de navegación —Mapa,
Centros de acopio, Necesitados, Voluntarios— con un **login único global** en la cabecera y un
**selector de rol** en Voluntarios (interfaz adaptativa repartidor/transportista, extensible).
Reubica toda la funcionalidad de features 1–3 sin perder nada, con las vistas públicas
(Distribución y Transparencia) como sub-vistas dentro del Mapa. Añade una **entidad backend
nueva**: **centro de acopio** (opcional, con **ubicación exacta pública**, registro abierto +
anti-abuso) que se muestra como puntos en el mapa. Mantiene la constitución.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend y Worker); continúa el stack actual.

**Primary Dependencies**: React + Vite + Leaflet (MapEngine) + lucide-react (existentes). Sin
dependencias nuevas. Backend: Hono, D1, KV (existentes).

**Storage**:
- D1: nueva tabla `collection_center` (centro de acopio: dueño, nombre, ubicación exacta,
  región, estado, marca temporal). Reutiliza `identity`, `support_person` (roles de voluntario)
  e inventario (features 2–3).
- KV: catálogo de roles de voluntario (ya existe `support_roles`).

**Testing**: Vitest + `@cloudflare/vitest-pool-workers` (CRUD de centros, anti-abuso, listado
para el mapa); Playwright (login único, navegación de 4 secciones, selector de rol, centro en
el mapa, móvil).

**Target Platform**: Edge (Cloudflare Workers/Pages). Mobile-first, español, WCAG 2.1 AA.

**Performance Goals**:
- Cambio de sección sin recarga completa (SPA), interfaz de rol en ≤2 s (SC-003).
- Login único: una sola verificación por sesión (SC-001).

**Constraints**:
- **No perder funcionalidad** de features 1–3 (FR-006); rutas previas redirigen (FR-016).
- Centro de acopio con **ubicación exacta pública** (FR-012b) — excepción consciente a la
  ofuscación, porque es un punto público (los hogares de necesitados siguen ofuscados).
- Registro de centros **abierto + anti-abuso** (FR-012d): límites de tasa + reportes.
- Login único global; sesión persistente (cookie ya con `Partitioned`).
- Cloudflare-only; costo mínimo.

**Scale/Scope**: 6 historias; principalmente reorganización de UI + 1 entidad/endpoints nuevos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Puerta | Estado |
|-----------|--------|--------|
| I. Dignidad y Protección | Hogares de necesitados siguen **ofuscados**; los centros de acopio son **puntos públicos** (ubicación exacta intencional, no es un hogar); identidad ligera protegida; rol no expone datos sensibles | ✅ PASS |
| II. Acceso Directo Sin Intermediarios | Centros de acopio **opcionales**; donar como individuo sigue funcionando; sin intermediarios obligatorios ni comisiones | ✅ PASS |
| III. Mobile-First / Accesible | 4 secciones usables en móvil sin scroll horizontal; login único accesible; selector de rol con teclado/ARIA; español | ✅ PASS |
| IV. Confianza, Veracidad y Tiempo Real | Mapa de centros en tiempo real (reutiliza patrón); anti-abuso (límites/reportes) para centros | ✅ PASS |
| V. Abierto, Público y Gratuito | Secciones abiertas; centros y vistas públicas; gratis; sin muro de login para ver | ✅ PASS |
| Restricciones de Plataforma | Cloudflare D1 + KV; sin nuevos servicios; costo mínimo | ✅ PASS |
| Interacción del Asistente | Decisiones del usuario resueltas por interfaz estructurada | ✅ PASS |

**Resultado**: Sin violaciones. La ubicación exacta del **centro** (no de un hogar) es un punto
público por diseño y no contradice el Principio I (que protege a las personas vulnerables).

## Project Structure

### Documentation (this feature)

```text
specs/004-secciones-roles-login/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
└── tasks.md  (en /speckit-tasks)
```

### Source Code (repository root) — reorganiza frontend, extiende backend

```text
web/
├── src/
│   ├── App.tsx                     # Shell de 4 secciones + login global (reescrito)
│   ├── components/
│   │   ├── LoginButton.tsx          # Control único de sesión en la cabecera (login/logout)
│   │   ├── SectionNav.tsx           # Navegación de las 4 secciones
│   │   └── RoleSwitcher.tsx         # Selector de rol del voluntario (multi-rol)
│   ├── sections/
│   │   ├── MapSection.tsx           # Mapa + sub-vistas (Distribución, Transparencia, centros)
│   │   ├── CentersSection.tsx       # Centros de acopio (donar + registrar centro + inventario)
│   │   ├── NeedsSection.tsx         # Necesitados (publicar, mis publicaciones, inventario)
│   │   └── VolunteersSection.tsx    # Voluntarios: registro + interfaz por rol (selector)
│   ├── components/centers/
│   │   └── CenterForm.tsx           # Registrar/editar centro de acopio (nombre, ubicación)
│   └── pages/                       # (existentes) reutilizadas dentro de las secciones
└── ...

backend/
├── src/
│   └── routes/centers.ts            # CRUD de centros de acopio + listado para el mapa
├── migrations/
│   └── 0004_centros_acopio.sql      # Tabla collection_center
└── src/index.ts                     # (extendido) monta /centers
```

**Structure Decision**: La feature es mayormente una **reorganización del frontend**: un shell
de 4 secciones con un login global, reutilizando las páginas existentes (MapPage, Publish,
Donate, Deliver, Inventory, Distribution, PublicLedger) dentro de las nuevas secciones. La
sección **Voluntarios** usa un `RoleSwitcher` que selecciona entre los roles de apoyo del
usuario y renderiza su interfaz. El único añadido de backend es la entidad **centro de acopio**
(`collection_center`) con sus endpoints y su capa de puntos en el mapa. Las rutas previas
(`#/publish`, `#/donate`, …) redirigen a su nueva ubicación para no romper enlaces.

## Complexity Tracking

> No aplica: sin violaciones de la constitución que requieran justificación. La reorganización
> preserva la funcionalidad y los principios; la ubicación exacta del centro es pública por
> diseño (no es un hogar de una persona vulnerable).
