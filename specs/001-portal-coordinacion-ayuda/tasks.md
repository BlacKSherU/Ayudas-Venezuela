---
description: "Task list for Portal de Coordinación de Ayuda"
---

# Tasks: Portal de Coordinación de Ayuda

**Input**: Design documents from `/specs/001-portal-coordinacion-ayuda/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Incluidas para las **rutas críticas**, por mandato de la constitución (sección
"Flujo de Desarrollo y Puertas de Calidad"): crear necesidad, emparejar, marcar entregado y
ofuscación de ubicación DEBEN tener pruebas automatizadas antes de producción.

**Organization**: Tareas agrupadas por historia de usuario para implementación y prueba
independientes. Rutas según la estructura de plan.md (`backend/` = Worker, `web/` = Pages).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario (US1–US4)
- Cada tarea incluye ruta de archivo concreta

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto y estructura base.

- [X] T001 Crear estructura monorepo (`backend/`, `web/`, `package.json` raíz con workspaces) según plan.md
- [X] T002 [P] Inicializar Worker backend: Hono + TypeScript + `backend/wrangler.jsonc` base en `backend/`
- [X] T003 [P] Inicializar frontend: Vite + React + TypeScript en `web/`
- [X] T004 [P] Configurar ESLint + Prettier + `tsconfig` en `backend/` y `web/`
- [X] T005 [P] Configurar runners de prueba: Vitest + `@cloudflare/vitest-pool-workers` en `backend/`, Playwright en `web/`
- [X] T006 [P] Añadir LICENSE de código abierto y `README.md` base (Principio V) en la raíz

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura central que DEBE completarse antes de cualquier historia.

**⚠️ CRITICAL**: Ninguna historia puede comenzar hasta completar esta fase.

- [X] T007 Crear migración D1 `backend/migrations/0001_init.sql` con todas las tablas (identity, need, need_item, commitment, audit_event, abuse_report) e índices por bounding box/región según data-model.md
- [X] T008 Configurar bindings en `backend/wrangler.jsonc`: D1 `DB`, Durable Object `MAP_ROOM`, KV `CONFIG`, secrets `SESSION_SECRET`/`EMAIL_FROM`
- [X] T009 [P] Implementar ofuscación geográfica (redondeo a rejilla ~1 km + resolución de `region_code`) en `backend/src/domain/geo.ts`
- [X] T010 [P] Implementar máquina de estados de necesidad con guardas de transición en `backend/src/domain/need-state.ts`
- [X] T011 [P] Implementar catálogo de insumos (seed + loader desde KV) en `backend/src/domain/categories.ts`
- [X] T012 Configurar app Hono: enrutado, CORS (origen de Pages), envoltura de errores en `backend/src/index.ts`
- [X] T013 [P] Implementar helpers de auditoría y logging estructurado (sin datos personales) en `backend/src/lib/audit.ts`
- [X] T014 Implementar identidad ligera (OTP por Cloudflare Email) + sesión por cookie firmada en `backend/src/lib/auth.ts` (depende de T007)
- [X] T015 [P] Implementar límites de tasa (KV) y detección de duplicados en `backend/src/lib/ratelimit.ts` y `backend/src/lib/dedupe.ts`
- [X] T016 Implementar capa de consultas D1 (CRUD + consulta por bounding box) en `backend/src/db/queries.ts` (depende de T007)
- [X] T017 Crear esqueleto del Durable Object `MapRoom` (WebSocket Hibernation, registro de conexiones por región) en `backend/src/do/map-room.ts`
- [X] T018 [P] Construir shell del frontend: enrutado, i18n en español, layout mobile-first/tema, base de accesibilidad en `web/src/`
- [X] T019 [P] Implementar cliente REST tipado en `web/src/lib/api.ts`
- [X] T020 [P] Implementar abstracción `MapEngine` + `LeafletEngine` (OSM raster, carga diferida) en `web/src/components/map/`

**Checkpoint**: Fundación lista — las historias pueden comenzar (en paralelo si hay equipo).

---

## Phase 3: User Story 1 - Publicar una necesidad (Priority: P1) 🎯 MVP

**Goal**: Una persona publica una necesidad (tipo de insumo, urgencia, zona) mediante
identidad ligera; queda registrada con ubicación **ofuscada** y gestionable solo por su autor.

**Independent Test**: Verificar la identidad por OTP, publicar una necesidad y comprobar que
queda registrada con coordenadas ofuscadas y consultable por detalle/lista, sin requerir
ningún donante.

### Tests for User Story 1 (rutas críticas)

- [X] T021 [P] [US1] Test de integración: `request-code`/`verify` de identidad (OTP + cookie de sesión) en `backend/tests/integration/identity.test.ts`
- [X] T022 [P] [US1] Test de integración: `POST /needs` crea con ubicación ofuscada y exige `contactPublicConsent` (FR-016/FR-011) en `backend/tests/integration/needs-create.test.ts`

### Implementation for User Story 1

- [X] T023 [US1] Implementar rutas de identidad (`request-code`, `verify`, `logout`) en `backend/src/routes/identity.ts` (depende de T014)
- [X] T024 [US1] Implementar `POST /needs` y `GET /needs/{id}` con ofuscación geográfica, validación Zod y auditoría en `backend/src/routes/needs.ts` (depende de T009, T013, T016)
- [X] T025 [US1] Implementar `PATCH/DELETE /needs/{id}` solo-titular (FR-018) en `backend/src/routes/needs.ts`
- [X] T026 [P] [US1] Construir UI de verificación de identidad (solicitar código, ingresar OTP) en `web/src/pages/` y `web/src/components/`
- [X] T027 [P] [US1] Construir `NeedForm` con selector de ubicación en mapa (MapEngine), tipo/urgencia/contacto y aviso de contacto público en `web/src/components/NeedForm.tsx`
- [X] T028 [P] [US1] Construir página "Mis publicaciones" (listar propias, editar, eliminar) en `web/src/pages/`
- [X] T029 [US1] Conectar crear/editar/eliminar al cliente API con estados de éxito/error en `web/src/`

**Checkpoint**: US1 funcional y testeable de forma independiente.

---

## Phase 4: User Story 2 - Explorar el mapa en tiempo real (Priority: P1) 🎯 MVP

**Goal**: Mapa interactivo que muestra necesidades cercanas, se actualiza **en vivo** (≤5 s),
permite filtrar por insumo/urgencia y degrada con elegancia sin geolocalización/sin WebSocket.

**Independent Test**: Abrir el mapa centrado en Venezuela con necesidades existentes; al
publicarse una nueva desde otra sesión, aparece en vivo (≤5 s); los filtros funcionan; sin
permiso de ubicación se muestra la lista de fallback.

### Tests for User Story 2 (rutas críticas)

- [X] T030 [P] [US2] Test de integración: `GET /needs` por bbox + filtros devuelve datos ofuscados en `backend/tests/integration/needs-list.test.ts`
- [X] T031 [P] [US2] Test de integración: difusión de `MapRoom` — `need.created` llega al cliente suscrito en `backend/tests/integration/realtime.test.ts`
- [X] T032 [P] [US2] Test E2E (Playwright): mapa carga en Venezuela, nueva necesidad aparece ≤5 s, filtros, fallback sin geo en `web/tests/e2e/map.spec.ts`

### Implementation for User Story 2

- [X] T033 [US2] Implementar `GET /needs` (bbox/status/category/urgency) en `backend/src/routes/needs.ts` (depende de T016)
- [X] T034 [US2] Implementar ruta `WSS /realtime` + enrutado al DO por región en `backend/src/index.ts` (depende de T017)
- [X] T035 [US2] Implementar lógica de difusión de `MapRoom`: `subscribe`/filtro por viewport, `hello`/`need.created|updated|closed` en `backend/src/do/map-room.ts`
- [X] T036 [US2] Conectar escrituras de necesidades a la notificación del DO (crear/actualizar/cerrar → difusión por región) en `backend/src/routes/needs.ts`
- [X] T037 [P] [US2] Implementar `NeedsLayer` (render/actualización/eliminación de marcadores y zonas) en `web/src/components/map/NeedsLayer.tsx`
- [X] T038 [P] [US2] Implementar hook `useRealtime` (suscripción WS, reconexión con backoff, fallback a polling, reconciliación por `updatedAt`) en `web/src/hooks/useRealtime.ts`
- [X] T039 [P] [US2] Implementar hook `useGeolocation` con degradación elegante (vista por defecto de Venezuela) en `web/src/hooks/useGeolocation.ts`
- [X] T040 [P] [US2] Implementar `Filters` (insumo/urgencia) y `NeedList` accesible de fallback en `web/src/components/`
- [X] T041 [US2] Ensamblar página del mapa: snapshot + stream en vivo + filtros + fallback en `web/src/pages/`

**Checkpoint**: US1 + US2 completas → **MVP** (publicar + mapa en vivo, ambas P1).

---

## Phase 5: User Story 3 - Comprometerse a atender una necesidad (Priority: P2)

**Goal**: Una persona donante se compromete con una necesidad de forma **exclusiva** (una a la
vez); el estado cambia para todos y se habilita el contacto; auto-liberación a las 12 h.

**Independent Test**: Sobre una necesidad pendiente (sembrada), comprometerse cambia su estado
a "comprometida"; un segundo intento recibe `409 ALREADY_COMMITTED`; tras 12 h sin entrega
vuelve a "pendiente".

### Tests for User Story 3 (rutas críticas)

- [ ] T042 [P] [US3] Test de integración: exclusividad de compromiso (segundo → `409 ALREADY_COMMITTED`) y `release` reabre a "pendiente" en `backend/tests/integration/commitments.test.ts`

### Implementation for User Story 3

- [ ] T043 [US3] Implementar `POST /needs/{id}/commit` (transición exclusiva, `committed_at`, auditoría, difusión) en `backend/src/routes/commitments.ts`
- [ ] T044 [US3] Implementar `POST /needs/{id}/release` (donante cancela → "pendiente") en `backend/src/routes/commitments.ts`
- [ ] T045 [US3] Implementar alarma de `MapRoom`: auto-liberar compromisos tras 12 h (FR-007) en `backend/src/do/map-room.ts`
- [ ] T046 [P] [US3] Construir UI de compromiso: botón comprometerse, estado "comprometida", mostrar `contactPublic`, en `409` sugerir alternativas (US3 escenario 3) en `web/src/components/` y página del mapa

**Checkpoint**: US3 funcional e independientemente testeable.

---

## Phase 6: User Story 4 - Confirmar entrega y cerrar (Priority: P2)

**Goal**: Marcar una necesidad como "entregada", retirarla de las vistas activas y reflejarla
en el conteo público agregado de necesidades resueltas (sin datos personales).

**Independent Test**: Sobre una necesidad comprometida (sembrada), confirmar entrega la pasa a
"entregada", emite `need.closed` y la retira del mapa; el contador público de resueltas sube.

### Tests for User Story 4 (rutas críticas)

- [ ] T047 [P] [US4] Test de integración: `resolve` por titular o donante comprometido → "entregada" + difusión `need.closed` en `backend/tests/integration/resolve.test.ts`

### Implementation for User Story 4

- [ ] T048 [US4] Implementar `POST /needs/{id}/resolve` (titular o donante comprometido) → "entregada", retirar, auditar, difundir en `backend/src/routes/needs.ts`
- [ ] T049 [US4] Implementar endpoint público de estadísticas agregadas `GET /stats` (conteo de resueltas, sin datos personales, FR-015) en `backend/src/routes/needs.ts`
- [ ] T050 [P] [US4] Construir acción de confirmar entrega + contador público de impacto en `web/src/`

**Checkpoint**: Las cuatro historias funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras transversales a varias historias.

- [ ] T051 [P] Implementar reportes anti-abuso: `POST /needs/{id}/report` + ocultamiento por umbral (FR-008) en `backend/src/routes/reports.ts`
- [ ] T052 Implementar expiración: necesidades pendientes 30 días → "expirada" mediante alarma de DO + Cron Trigger de respaldo (FR-019) en `backend/src/do/map-room.ts` y `backend/wrangler.jsonc`
- [ ] T053 [P] Pase de accesibilidad a WCAG 2.1 AA (foco, contraste, ARIA, teclado) en `web/src/`
- [ ] T054 [P] Rendimiento: presupuesto de bundle, carga diferida del mapa, verificar ≤3 s en 3G (SC-004) en config de build de `web/`
- [ ] T055 [P] Observabilidad: logs/métricas estructurados + Logpush (sin datos personales) en `backend/`
- [ ] T056 [P] Endurecimiento de seguridad: límites de entrada, Turnstile opcional al publicar, revisión de CORS/secrets en `backend/`
- [ ] T057 [P] Documentación: actualizar `README.md` y `docs/` (despliegue, contribución, licencia abierta)
- [ ] T058 Validar `quickstart.md` de extremo a extremo (local + smoke test de despliegue)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — empieza de inmediato.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias.
- **User Stories (Phase 3–6)**: dependen de la Fundación. Luego pueden ir en paralelo (con
  equipo) o secuencialmente por prioridad (US1 → US2 → US3 → US4).
- **Polish (Phase 7)**: depende de las historias deseadas completas.

### User Story Dependencies

- **US1 (P1)**: tras Fundación. Sin dependencia de otras historias.
- **US2 (P1)**: tras Fundación. Independiente de US1 (testeable con datos sembrados); juntas
  forman el MVP.
- **US3 (P2)**: tras Fundación. Lógicamente actúa sobre una necesidad existente (US1), pero
  testeable de forma aislada con una necesidad sembrada.
- **US4 (P2)**: tras Fundación. Actúa sobre una necesidad comprometida (US3), pero testeable
  con una necesidad comprometida sembrada.

### Within Each User Story

- Las pruebas (rutas críticas) se escriben primero y deben fallar antes de implementar.
- Modelos/dominio antes que servicios; servicios antes que endpoints; backend antes de
  cablear la UI; núcleo antes de la integración.

### Parallel Opportunities

- Setup: T002–T006 [P] en paralelo.
- Fundación: T009, T010, T011, T013, T015, T018, T019, T020 [P] en paralelo (T007/T008
  primero; T014 y T016 dependen de T007).
- Tras la Fundación, distintas historias pueden trabajarse en paralelo por distintas personas.
- Dentro de una historia, las tareas [P] (archivos distintos) corren en paralelo.

---

## Parallel Example: User Story 2 (mapa en vivo)

```bash
# Pruebas de US2 juntas:
Task: "Integración GET /needs bbox+filtros en backend/tests/integration/needs-list.test.ts"
Task: "Integración difusión MapRoom en backend/tests/integration/realtime.test.ts"
Task: "E2E mapa en web/tests/e2e/map.spec.ts"

# Componentes frontend de US2 en paralelo:
Task: "NeedsLayer en web/src/components/map/NeedsLayer.tsx"
Task: "useRealtime en web/src/hooks/useRealtime.ts"
Task: "useGeolocation en web/src/hooks/useGeolocation.ts"
Task: "Filters + NeedList en web/src/components/"
```

---

## Implementation Strategy

### MVP First (US1 + US2 — ambas P1)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todo).
3. Completar Phase 3 (US1) y Phase 4 (US2): publicar necesidad + mapa interactivo en vivo.
4. **DETENER y VALIDAR**: el bucle esencial donante↔necesitado con el mapa en tiempo real.
5. Desplegar/demostrar (MVP).

### Incremental Delivery

1. Setup + Foundational → fundación lista.
2. + US1 + US2 → MVP (publicar + mapa en vivo) → desplegar.
3. + US3 (comprometerse) → desplegar.
4. + US4 (confirmar entrega + impacto) → desplegar.
5. + Polish (anti-abuso, expiración, accesibilidad, rendimiento, seguridad).

### Parallel Team Strategy

1. El equipo completa Setup + Foundational juntos.
2. Luego: Persona A → US1; Persona B → US2; Persona C → prepara US3/US4 con datos sembrados.
3. Las historias se integran de forma independiente sin romper las previas.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- La etiqueta [Story] mapea cada tarea a su historia para trazabilidad.
- Cada historia debe poder completarse y probarse de forma independiente.
- Verificar que las pruebas de rutas críticas fallan antes de implementar.
- Hacer commit tras cada tarea o grupo lógico.
- Privacidad por diseño: nunca exponer dirección exacta ni contacto sin consentimiento.
