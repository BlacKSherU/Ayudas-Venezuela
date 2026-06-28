---
description: "Task list for Feature 4 — Secciones, Roles y Login Único"
---

# Tasks: Secciones, Roles y Login Único

**Input**: Design documents from `/specs/004-secciones-roles-login/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Incluidas para rutas críticas: centros de acopio (backend) y los flujos clave
(login único, 4 secciones, rol del voluntario) por e2e.

**Organization**: Por historia de usuario (US1–US6). Mayormente reorganización de frontend +
la entidad centro de acopio. Reutiliza features 1–3 sin perder nada.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1–US6 · rutas de archivo concretas

---

## Phase 1: Setup

- [x] T001 Crear la migración `backend/migrations/0004_centros_acopio.sql` con la tabla `collection_center` (dueño, nombre, lat/lng exactas, region_code, note, status, reports_count, created_at) e índices, según data-model.md
- [x] T002 [P] Confirmar el catálogo de roles de voluntario (`support_roles` en KV ya existe; documentar que es la fuente extensible de tipos de voluntario) en `specs/004-secciones-roles-login/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Debe completarse antes de las historias.

- [x] T003 Implementar la capa de consultas de centros (crear con límite de tasa, listar activos por bbox, "míos", editar/borrar del dueño, reportar→ocultar por umbral) en `backend/src/db/centers-queries.ts`
- [x] T004 Implementar las rutas `GET/POST/PATCH/DELETE /centers`, `GET /centers/mine` y `POST /centers/:id/report` en `backend/src/routes/centers.ts`
- [x] T005 Montar `/api/v1/centers` en `backend/src/index.ts`
- [x] T006 [P] Extender `web/src/lib/api.ts` con los endpoints y tipos de centros de acopio
- [x] T007 [P] Construir `LoginButton` (control único de sesión: iniciar/cerrar sesión) en `web/src/components/LoginButton.tsx`
- [x] T008 [P] Construir `SectionNav` (navegación de las 4 secciones) en `web/src/components/SectionNav.tsx`
- [x] T009 Reestructurar `web/src/App.tsx` como shell de 4 secciones con cabecera (LoginButton) y router por hash, incluyendo redirección de rutas previas
- [x] T010 [P] Añadir una capa de **centros** (marcadores) a la abstracción de mapa en `web/src/components/map/MapEngine.ts` y `LeafletEngine.ts`

**Checkpoint**: Shell, login y backend de centros listos — las historias pueden comenzar.

---

## Phase 3: User Story 1 - Login único global (Priority: P1) 🎯 MVP

**Goal**: Un solo botón de sesión en la cabecera; una verificación por sesión; logout claro.

**Independent Test**: Iniciar sesión una vez y actuar en cualquier sección sin re-verificar;
cerrar sesión vuelve al estado anónimo.

### Tests for User Story 1

- [x] T011 [P] [US1] Test e2e: login único (una verificación, sesión persistente, logout) en `web/tests/e2e/login.spec.ts`

### Implementation for User Story 1

- [x] T012 [US1] Integrar `LoginButton` en la cabecera y centralizar el `IdentityGate` (panel/modal) en `web/src/App.tsx`
- [x] T013 [US1] Reemplazar los gates de identidad por acción por un aviso que invita al login global en las páginas existentes (`PublishPage`, `DonatePage`, `DeliverPage`, `InventoryPage`, `MyNeedsPage`)

**Checkpoint**: US1 funcional.

---

## Phase 4: User Story 2 - Cuatro secciones de navegación (Priority: P1) 🎯 MVP

**Goal**: Navegación con Mapa (por defecto), Centros de acopio, Necesitados, Voluntarios;
funcionalidad previa reubicada sin pérdida; vistas públicas dentro del Mapa.

**Independent Test**: Navegar las 4 secciones, confirmar Mapa por defecto y que cada función
previa está accesible; rutas antiguas redirigen.

### Tests for User Story 2

- [x] T014 [P] [US2] Test e2e: navegar las 4 secciones, Mapa por defecto y redirección de rutas previas en `web/tests/e2e/sections.spec.ts`

### Implementation for User Story 2

- [x] T015 [US2] Construir `MapSection` (mapa + sub-vistas Distribución y Transparencia) en `web/src/sections/MapSection.tsx`
- [x] T016 [US2] Construir `CentersSection` (donar + registrar centro + inventario del centro) en `web/src/sections/CentersSection.tsx`
- [x] T017 [US2] Construir `NeedsSection` (publicar + mis publicaciones + inventario) en `web/src/sections/NeedsSection.tsx`
- [x] T018 [US2] Construir `VolunteersSection` (contenedor) en `web/src/sections/VolunteersSection.tsx`
- [x] T019 [US2] Implementar la redirección de rutas previas (`#/donate`, `#/inventory`, `#/distribution`, `#/ledger`, `#/mine`, `#/publish`, `#/deliver`) a su nueva sección en `web/src/App.tsx`

**Checkpoint**: US1+US2 → navegación nueva con login único y todo lo previo accesible.

---

## Phase 5: User Story 3 - Voluntarios con interfaz por rol (Priority: P1) 🎯 MVP

**Goal**: La sección Voluntarios muestra la interfaz del rol; selector si hay varios;
extensible; registro si no es voluntario.

**Independent Test**: Entrar como repartidor (su interfaz), como transportista (la suya), con
ambos (selector), y sin rol (registro).

### Tests for User Story 3

- [x] T020 [P] [US3] Test e2e: interfaz por rol y selector multi-rol en `web/tests/e2e/volunteers.spec.ts`

### Implementation for User Story 3

- [x] T021 [US3] Construir `RoleSwitcher` (lista los roles del usuario y cambia entre ellos) en `web/src/components/RoleSwitcher.tsx`
- [x] T022 [US3] Implementar el mapa rol→componente extensible (repartidor/transportista) en `VolunteersSection`, reutilizando el flujo de órdenes (`DeliverPage`)
- [x] T023 [US3] Ofrecer el registro de voluntario desde la sección cuando el usuario no tiene rol, en `web/src/sections/VolunteersSection.tsx`

**Checkpoint**: US1+US2+US3 → **MVP** (login único + 4 secciones + voluntarios por rol).

---

## Phase 6: User Story 4 - Centros de acopio (Priority: P2)

**Goal**: Registrar centros (entidad con nombre + ubicación exacta), mostrarlos en el mapa,
donar opcionalmente desde un centro; registro abierto + anti-abuso.

**Independent Test**: Registrar un centro y verlo como marcador exacto en el mapa; donar desde
él usando su ubicación como recogida; reportar un centro lo oculta tras el umbral.

### Tests for User Story 4

- [x] T024 [P] [US4] Test de integración: crear centro (límite de tasa), listar activos por bbox, y ocultar por reportes en `backend/tests/integration/centers.test.ts`

### Implementation for User Story 4

- [x] T025 [US4] Construir `CenterForm` (registrar/editar centro: nombre + punto exacto en el mapa) en `web/src/components/centers/CenterForm.tsx`
- [x] T026 [US4] Mostrar los centros como capa en el mapa y "mis centros" en `web/src/sections/CentersSection.tsx`
- [x] T027 [US4] Permitir donar desde un centro (`centerId` opcional → punto de recogida = centro) en `web/src/pages/DonatePage.tsx` y `backend/src/routes/orders.ts`

**Checkpoint**: US4 funcional.

---

## Phase 7: User Story 5 - Sección Necesitados (Priority: P2)

**Goal**: Agrupar publicar necesidad, mis publicaciones e inventario en la sección Necesitados.

**Independent Test**: Desde Necesitados, publicar una necesidad y ver publicaciones e inventario.

### Implementation for User Story 5

- [x] T028 [US5] Componer `NeedsSection` reutilizando `PublishPage`, `MyNeedsPage` e `InventoryPage` en `web/src/sections/NeedsSection.tsx`

**Checkpoint**: US5 funcional.

---

## Phase 8: User Story 6 - Multi-rol por usuario (Priority: P2)

**Goal**: Una misma sesión opera en varias secciones (necesitado + voluntario + centro) sin
cuentas separadas ni pérdida de estado.

**Independent Test**: Con una sesión, publicar una necesidad y registrarse como voluntario, y
usar ambas secciones sin conflicto.

### Tests for User Story 6

- [x] T029 [P] [US6] Test e2e: misma sesión usada como necesitada y voluntaria sin conflicto en `web/tests/e2e/multirole.spec.ts`

### Implementation for User Story 6

- [x] T030 [US6] Verificar/ajustar que la sesión global y los datos por rol coexisten (sin cuentas separadas) en `web/src/App.tsx` y las secciones

**Checkpoint**: US6 funcional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T031 [P] Pase de accesibilidad WCAG 2.1 AA del shell, navegación, selector de rol y formularios en `web/src/`
- [x] T032 [P] Rendimiento: cambio de sección sin recarga completa y capa de centros eficiente en `web/` y `backend/`
- [x] T033 [P] Documentación: actualizar `README.md` y `quickstart.md` (4 secciones, login, centros)
- [x] T034 Validar `quickstart.md` de extremo a extremo (local + smoke de despliegue)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — **BLOQUEA** las historias (shell, login, centros backend).
- **User Stories (Phase 3–8)**: tras la Fundación; luego en paralelo o por prioridad (US1→US2→US3 primero).
- **Polish (Phase 9)**: tras las historias deseadas.

### User Story Dependencies

- **US1 (P1)**: tras Fundación (shell + LoginButton).
- **US2 (P1)**: tras Fundación; usa el shell; reubica páginas existentes.
- **US3 (P1)**: tras US2 (la sección Voluntarios vive en el shell); usa `support_person`.
- **US4 (P2)**: tras Fundación (backend de centros + capa de mapa); independiente de US3.
- **US5 (P2)**: tras US2 (sección); reutiliza páginas.
- **US6 (P2)**: transversal; se valida tras US1–US3.

### Parallel Opportunities

- Setup: T002 [P].
- Fundación: T006, T007, T008, T010 [P] (T003/T004/T005 backend en orden; T009 tras T007/T008).
- Tras la Fundación, US1/US2/US4 pueden avanzar en paralelo por distintas personas.

---

## Parallel Example: Fundación

```bash
Task: "LoginButton en web/src/components/LoginButton.tsx"
Task: "SectionNav en web/src/components/SectionNav.tsx"
Task: "Capa de centros en web/src/components/map/"
Task: "api.ts: endpoints de centros en web/src/lib/api.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Setup + Foundational (shell, login, backend de centros, capa de mapa).
2. US1 (login único) → US2 (4 secciones) → US3 (voluntarios por rol).
3. **DETENER y VALIDAR**: navegación nueva con login único, secciones y rol adaptativo, sin
   perder funcionalidad previa.
4. Desplegar/demostrar (MVP de la reorganización).

### Incremental Delivery

1. Fundación lista (incluye migración de centros).
2. + US1+US2+US3 → MVP → desplegar.
3. + US4 (centros en el mapa + donar desde centro) → + US5 (necesitados) → + US6 (multi-rol).
4. + Polish.

### Parallel Team Strategy

1. Equipo completa Setup + Foundational.
2. Persona A → US1; Persona B → US2; Persona C → US4 (centros); Persona D → US3.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- NO perder funcionalidad de features 1–3; rutas previas redirigen.
- Centro de acopio: ubicación **exacta pública** (punto al que se acude); hogares de
  necesitados siguen **ofuscados**.
- Login único global; una verificación por sesión.
- Roles de voluntario extensibles vía catálogo + mapa rol→componente.
