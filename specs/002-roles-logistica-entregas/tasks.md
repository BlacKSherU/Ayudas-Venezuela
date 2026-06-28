---
description: "Task list for Feature 2 — Roles, Dashboards y Logística de Entregas"
---

# Tasks: Roles, Dashboards y Logística de Entregas

**Input**: Design documents from `/specs/002-roles-logistica-entregas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Incluidas para rutas críticas (mandato de la constitución): registro con cédula
cifrada, crear/tomar/confirmar órdenes, evidencia de incidencias, difusión de rastreo, y
auto-despliegue de recursos humanos.

**Organization**: Por historia de usuario (US1–US8). Extiende el código de la feature 1
(`backend/` = Worker, `web/` = Pages).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1–US8
- Rutas de archivo concretas en cada tarea

---

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Añadir a `backend/wrangler.jsonc`: bucket R2 `MEDIA`, Durable Object `DELIVERY_ROOM` (clase `DeliveryRoom`) y entrada de migración `v2`
- [X] T002 [P] Crear migración `backend/migrations/0002_logistica.sql` con tablas nuevas (support_person, delivery_order, order_item, incident, media_object, rating, self_deploy_assignment) y columnas de ubicación exacta cifrada en `need`, según data-model.md
- [X] T003 [P] Sembrar catálogos en KV (`support_roles`, `resource_types`, `params`) y documentar en `specs/002-roles-logistica-entregas/quickstart.md`
- [X] T004 [P] Extender el tipo `Env` (binding R2 `MEDIA`, DO `DELIVERY_ROOM`, secret `ENCRYPTION_KEY`) en `backend/src/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Debe completarse antes de las historias.

- [X] T005 [P] Implementar cifrado AES-GCM (encrypt/decrypt + `key_version`) con `ENCRYPTION_KEY` en `backend/src/lib/encryption.ts`
- [X] T006 [P] Implementar helpers de R2 (validación de tipo/tamaño, put/get, claves opacas) en `backend/src/lib/r2.ts`
- [X] T007 [P] Implementar códigos de un solo uso (generación + verificación por hash) en `backend/src/lib/codes.ts`
- [X] T008 [P] Implementar catálogo de roles de apoyo (loader KV) en `backend/src/domain/roles.ts`
- [X] T009 [P] Implementar catálogo de tipos de recurso (con `kind` físico/humano, `transportable`) en `backend/src/domain/resource-types.ts`
- [X] T010 [P] Implementar máquina de estados de orden en `backend/src/domain/order-state.ts`
- [X] T011 [P] Implementar cálculo de reputación + reglas de suspensión en `backend/src/domain/reputation.ts`
- [X] T012 [P] Implementar ETA (haversine + velocidad media desde KV) en `backend/src/domain/eta.ts`
- [X] T013 Crear esqueleto del Durable Object `DeliveryRoom` (WebSocket Hibernation, membresía de partes) en `backend/src/do/delivery-room.ts`
- [X] T014 Extender la capa de consultas D1 (órdenes, apoyo, valoraciones, incidencias, medios) en `backend/src/db/queries.ts`
- [X] T015 Actualizar la creación de necesidades de la feature 1 para **cifrar y guardar la ubicación exacta** (FR-026) en `backend/src/routes/needs.ts`
- [X] T016 Registrar el export de `DeliveryRoom`, montar rutas nuevas y la ruta `WSS /orders/:id/track` en `backend/src/index.ts`
- [X] T017 [P] Extender el cliente REST del frontend con los endpoints de la feature 2 en `web/src/lib/api.ts`
- [X] T018 [P] Construir el componente `MediaCapture` (cámara, validación de tipo/tamaño) en `web/src/components/MediaCapture.tsx`

**Checkpoint**: Fundación lista — las historias pueden comenzar.

---

## Phase 3: User Story 1 - Registro de personal de apoyo (Priority: P1) 🎯 MVP

**Goal**: Una persona se registra como repartidor/transportista con cédula + foto, cifradas y
nunca públicas, y queda habilitada (auto-aprobación).

**Independent Test**: Registrarse como transportista subiendo foto de cédula y número, y
verificar que el perfil queda activo y que la cédula no aparece en ninguna respuesta pública.

### Tests for User Story 1

- [X] T019 [P] [US1] Test de integración: el registro cifra la cédula y nunca la expone públicamente en `backend/tests/integration/support-register.test.ts`

### Implementation for User Story 1

- [X] T020 [US1] Implementar `POST /media` (subida a R2, cifrado para `kind=cedula`, límites de tamaño/tipo) en `backend/src/routes/media.ts`
- [X] T021 [US1] Implementar `GET /media/:key` con control de acceso (solo partes autorizadas) en `backend/src/routes/media.ts`
- [X] T022 [US1] Implementar `POST /support/register` y `GET /support/me` (cédula cifrada, auto-aprobación) en `backend/src/routes/support.ts`
- [X] T023 [P] [US1] Construir `SupportSignupPage` (rol, número y foto de cédula) en `web/src/pages/SupportSignupPage.tsx`
- [X] T024 [US1] Conectar el alta de apoyo al API (subir foto → registrar) con estados de éxito/error en `web/src/`

**Checkpoint**: US1 funcional e independientemente testeable.

---

## Phase 4: User Story 2 - Donante prepara recursos y publica orden (Priority: P1) 🎯 MVP

**Goal**: Desde una donación comprometida, el donante marca "listo para llevar" e indica zona
de recogida; se crea una orden de entrega disponible con código de recogida.

**Independent Test**: Marcar una donación como lista y verificar que aparece una orden
disponible con recursos, zona de recogida (ofuscada) y código de recogida visible al donante.

### Tests for User Story 2

- [X] T025 [P] [US2] Test de integración: crear orden desde donación lista, con zona ofuscada, exacta cifrada y código de recogida en `backend/tests/integration/orders-create.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Implementar `POST /orders` (desde necesidad comprometida, ofusca recogida, cifra exacta, genera `pickup_code`) en `backend/src/routes/orders.ts`
- [X] T027 [US2] Persistir orden + `order_item` + hashes de códigos en `backend/src/db/queries.ts`
- [X] T028 [P] [US2] Frontend: acción "marcar listo para llevar" del donante y mostrar el código de recogida en `web/src/`

**Checkpoint**: US2 funcional; ya hay órdenes disponibles.

---

## Phase 5: User Story 3 - Tomar una orden y completar la entrega (Priority: P1) 🎯 MVP

**Goal**: El personal de apoyo ve órdenes disponibles, toma una (exclusivo), recoge con el
código del donante, entrega con el código del necesitado, y todo se refleja en tiempo real.

**Independent Test**: Con una orden disponible, tomarla (segundo intento → 409), confirmar
recogida y entrega con códigos, y verificar que la necesidad queda atendida y la orden cerrada.

### Tests for User Story 3

- [X] T029 [P] [US3] Test de integración: toma exclusiva (409 ALREADY_TAKEN), recogida/entrega con códigos válidos/ inválidos, y cierre de la necesidad en `backend/tests/integration/orders-flow.test.ts`

### Implementation for User Story 3

- [X] T030 [US3] Implementar `GET /orders` (disponibles por bbox/región, sin direcciones exactas) en `backend/src/routes/orders.ts`
- [X] T031 [US3] Implementar `POST /orders/:id/take` (claim exclusivo; revela direcciones exactas descifradas solo al asignado) en `backend/src/routes/orders.ts`
- [X] T032 [US3] Implementar `POST /orders/:id/pickup` y `POST /orders/:id/deliver` (verificación de códigos; marcar necesidad atendida; difundir) en `backend/src/routes/orders.ts`
- [X] T033 [US3] Implementar `POST /orders/:id/release` y auto-liberación por inactividad (alarma de `DeliveryRoom` + Cron de respaldo) en `backend/src/do/delivery-room.ts`
- [X] T034 [P] [US3] Construir `OrdersPage` (listado de disponibles + tomar) en `web/src/pages/OrdersPage.tsx`
- [X] T035 [P] [US3] Construir `OrderDetailPage` + `CodeEntry` (flujo recogida/entrega con códigos) en `web/src/pages/OrderDetailPage.tsx` y `web/src/components/CodeEntry.tsx`
- [X] T036 [US3] Conectar el flujo de orden al API y al estado en tiempo real en `web/src/`

**Checkpoint**: US1+US2+US3 → **MVP del sistema de entregas autónomo**.

---

## Phase 6: User Story 4 - Dashboard del donante (Priority: P2)

**Goal**: Panel con todas las necesidades, distancia a cada una, recursos más solicitados y
métricas por categoría/urgencia.

**Independent Test**: Con necesidades y la ubicación del donante, abrir el panel y verificar
distancias correctas y el ranking de más solicitados.

### Tests for User Story 4

- [ ] T037 [P] [US4] Test de integración: `dashboard/donor` devuelve distancias, top solicitados y métricas en `backend/tests/integration/dashboard-donor.test.ts`

### Implementation for User Story 4

- [ ] T038 [US4] Implementar `GET /dashboard/donor` (distancia haversine, ranking por categoría, conteos) en `backend/src/routes/dashboards.ts`
- [ ] T039 [P] [US4] Construir `DonorDashboardPage` en `web/src/pages/DonorDashboardPage.tsx`

**Checkpoint**: US4 funcional.

---

## Phase 7: User Story 5 - Dashboard del necesitado (Priority: P2)

**Goal**: Panel con las entregas dirigidas a la persona, quién envía (sin datos sensibles), qué
recursos y ETA.

**Independent Test**: Con una entrega en curso, abrir el panel y verificar estado + ETA, sin
exponer la identidad/cédula del transportista.

### Tests for User Story 5

- [ ] T040 [P] [US5] Test de integración: `dashboard/recipient` muestra entregas, ETA y rol/reputación del apoyo sin datos sensibles en `backend/tests/integration/dashboard-recipient.test.ts`

### Implementation for User Story 5

- [ ] T041 [US5] Implementar `GET /dashboard/recipient` (entregas + estado + ETA + rol/reputación) en `backend/src/routes/dashboards.ts`
- [ ] T042 [P] [US5] Construir `RecipientDashboardPage` en `web/src/pages/RecipientDashboardPage.tsx`

**Checkpoint**: US5 funcional.

---

## Phase 8: User Story 6 - Gestión de incidencias en ruta (Priority: P2)

**Goal**: Reportar incidencias (bloqueo/robo/daño/retraso) con foto/video; quedan registradas y
visibles para las partes; robo/daño puede reabrir la necesidad.

**Independent Test**: En una entrega en curso, reportar un robo con foto y verificar que se
registra, cambia la orden a "con incidencia" y notifica a las partes.

### Tests for User Story 6

- [ ] T043 [P] [US6] Test de integración: incidencia con evidencia obligatoria para robo/daño y cambio de estado en `backend/tests/integration/incidents.test.ts`

### Implementation for User Story 6

- [ ] T044 [US6] Implementar `POST /orders/:id/incidents` (evidencia desde R2, estado "con_incidencia", reabrir necesidad si robo/daño) en `backend/src/routes/incidents.ts`
- [ ] T045 [P] [US6] Construir UI de reporte de incidencia (`MediaCapture` + tipo) en `web/src/components/` y `OrderDetailPage`

**Checkpoint**: US6 funcional.

---

## Phase 9: User Story 7 - Rastreo en vivo de la entrega (Priority: P3)

**Goal**: Mientras el transportista tiene la app abierta, comparte su ubicación precisa con las
partes; el necesitado ve ETA en vivo; deja de compartirse al terminar.

**Independent Test**: Con una entrega activa, verificar que la posición del transportista se
difunde solo al donante y al necesitado, y que cesa al entregar.

### Tests for User Story 7

- [ ] T046 [P] [US7] Test de integración: `DeliveryRoom` difunde `position.update` solo a las partes y recalcula ETA en `backend/tests/integration/delivery-track.test.ts`

### Implementation for User Story 7

- [ ] T047 [US7] Implementar la ruta `WSS /orders/:id/track` con verificación de membresía (parte de la orden) en `backend/src/index.ts`
- [ ] T048 [US7] Implementar en `DeliveryRoom` el manejo de `position`, recálculo de ETA y difusión a las partes en `backend/src/do/delivery-room.ts`
- [ ] T049 [P] [US7] Implementar hooks `useLivePosition` (watchPosition) y `useDeliveryRealtime` (WS) en `web/src/hooks/`
- [ ] T050 [P] [US7] Construir `LiveTrackMap` (ubicación en vivo sobre el mapa) en `web/src/components/LiveTrackMap.tsx`
- [ ] T051 [US7] Integrar el rastreo en vivo en los paneles de donante y necesitado en `web/src/`

**Checkpoint**: US7 funcional.

---

## Phase 10: User Story 8 - Recursos ampliados y agnósticos (Priority: P2)

**Goal**: Soportar herramientas y recursos humanos (médico/rescatista/voluntario) con flujo
híbrido (auto-despliegue u opción de transporte); roles y tipos configurables sin redeploy.

**Independent Test**: Publicar una necesidad de recurso humano, ofrecerse (auto-despliegue) y
verificar que se gestiona por su flujo; añadir un tipo nuevo solo por configuración.

### Tests for User Story 8

- [ ] T052 [P] [US8] Test de integración: necesidad de recurso humano + auto-despliegue híbrido (con/sin transporte) en `backend/tests/integration/self-deploy.test.ts`

### Implementation for User Story 8

- [ ] T053 [US8] Implementar `POST /needs/:id/self-deploy` (auto-despliegue; `wantsTransport` genera orden) en `backend/src/routes/orders.ts`
- [ ] T054 [US8] Implementar `GET /catalog/roles` y `GET /catalog/resource-types` (públicos, desde KV) en `backend/src/routes/`
- [ ] T055 [P] [US8] Frontend: ofrecerse para recurso humano y selección de tipos desde el catálogo en `web/src/`
- [ ] T056 [US8] Asegurar que la creación/listado de necesidades maneja `kind` (físico/humano) de forma agnóstica en `web/src/` y `backend/src/routes/needs.ts`

**Checkpoint**: US8 funcional; sistema agnóstico verificado.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T057 [P] Retención: purgar evidencias de medios > 90 días vía Cron + borrado en R2 en `backend/src/jobs/media-retention.ts`
- [ ] T058 [P] Conectar la suspensión automática por reputación baja/reportes (con pruebas) en `backend/src/domain/reputation.ts` y tests
- [ ] T059 [P] Pase de accesibilidad WCAG 2.1 AA en las páginas nuevas en `web/src/`
- [ ] T060 [P] Endurecimiento de seguridad: control de acceso a medios, manejo de la clave de cifrado, límites de tasa en `backend/`
- [ ] T061 [P] Rendimiento: carga diferida de dashboards y mapa de rastreo, presupuesto 3G en la config de build de `web/`
- [ ] T062 [P] Documentación: actualizar `README.md` y `quickstart.md` (R2, secrets, catálogos)
- [ ] T063 Validar `quickstart.md` de extremo a extremo (local + smoke de despliegue)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias.
- **User Stories (Phase 3–10)**: tras la Fundación; luego en paralelo (con equipo) o por
  prioridad (US1→US2→US3 primero, el resto P2/P3).
- **Polish (Phase 11)**: tras las historias deseadas.

### User Story Dependencies

- **US1 (P1)**: tras Fundación. Base para que existan transportistas.
- **US2 (P1)**: tras Fundación. Crea las órdenes (precondición lógica de US3).
- **US3 (P1)**: tras US1 y US2 (necesita apoyo registrado y orden disponible); testeable con
  datos sembrados.
- **US4, US5 (P2)**: tras Fundación; US5 se enriquece con US3/US7 pero es testeable aislada.
- **US6 (P2)**: actúa sobre una orden en curso (US3); testeable con orden sembrada.
- **US7 (P3)**: sobre una entrega activa (US3); testeable con orden sembrada.
- **US8 (P2)**: tras Fundación; usa los catálogos; flujo de recursos humanos independiente.

### Within Each User Story

- Pruebas de ruta crítica primero (deben fallar antes de implementar).
- Dominio/lib → consultas → endpoints → cableado de UI → integración.

### Parallel Opportunities

- Setup: T002–T004 [P].
- Fundación: T005–T012, T017, T018 [P] (T013/T014/T015/T016 dependen de migración/bindings).
- Tras la Fundación, distintas historias en paralelo por distintas personas.

---

## Parallel Example: User Story 3 (tomar y completar)

```bash
# Backend del flujo de orden (mismo archivo orders.ts → secuencial), UI en paralelo:
Task: "OrdersPage en web/src/pages/OrdersPage.tsx"
Task: "OrderDetailPage + CodeEntry en web/src/pages/OrderDetailPage.tsx"
# La prueba de integración del flujo corre en paralelo a la construcción de la UI:
Task: "Integración del flujo de orden en backend/tests/integration/orders-flow.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 — las tres P1)

1. Setup + Foundational.
2. US1 (registro apoyo) → US2 (orden disponible) → US3 (tomar y entregar).
3. **DETENER y VALIDAR**: el bucle autónomo donante→transportista→necesitado con códigos.
4. Desplegar/demostrar (MVP de logística).

### Incremental Delivery

1. Fundación lista.
2. + US1+US2+US3 → MVP de entregas → desplegar.
3. + US4/US5 (dashboards) → desplegar.
4. + US6 (incidencias) → + US7 (rastreo) → + US8 (recursos ampliados).
5. + Polish (retención, suspensión, accesibilidad, seguridad, rendimiento).

### Parallel Team Strategy

1. Equipo completa Setup + Foundational.
2. Persona A → US1; Persona B → US2/US3; Persona C → US4/US5; Persona D → US6/US7/US8.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Privacidad por diseño: cédula y ubicación exacta cifradas; exacta/rastreo solo a las partes.
- Confirmar pruebas de ruta crítica en rojo antes de implementar.
- Commit tras cada tarea o grupo lógico.
- Mantener catálogos (roles/recursos) configurables: añadir tipos sin tocar código.
