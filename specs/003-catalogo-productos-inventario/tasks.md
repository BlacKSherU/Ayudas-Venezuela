---
description: "Task list for Feature 3 — Catálogo de Productos e Inventario Público"
---

# Tasks: Catálogo de Productos e Inventario Público

**Input**: Design documents from `/specs/003-catalogo-productos-inventario/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Incluidas para rutas críticas (mandato de la constitución): deduplicación,
inmutabilidad del libro, bajas con control de saldo, custodia en dos pasos y migración sin
pérdida.

**Organization**: Por historia de usuario (US1–US7). Extiende el código de features 1 y 2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizable (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1–US7 · rutas de archivo concretas en cada tarea

---

## Phase 1: Setup

- [X] T001 Crear el archivo de migración `backend/migrations/0003_catalogo_inventario.sql` (esqueleto inicial)
- [X] T002 [P] Sembrar `unit_factors` en KV (masa/volumen/conteo) y documentarlo en `specs/003-catalogo-productos-inventario/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Debe completarse antes de las historias (crea el esquema y el dominio base).

- [X] T003 Completar la migración `0003`: tablas `category`, `product`, `inventory`, `inventory_movement`, `product_balance`; columnas `product_id` en `need_item`/`order_item`; `identity.public_name`; FK de `category`; seed de `category` desde los códigos actuales, en `backend/migrations/0003_catalogo_inventario.sql`
- [X] T004 [P] Implementar normalización de nombres (minúsculas, trim, sin acentos/espacios extra) en `backend/src/domain/normalize.ts`
- [X] T005 [P] Implementar unidades/dimensiones y conversión a unidad base (factores desde KV) en `backend/src/domain/units.ts`
- [X] T006 [P] Implementar reglas del libro (tipos de movimiento, dirección, append-only, efecto en saldo) en `backend/src/domain/ledger.ts`
- [X] T007 Implementar capa de consultas: crear-o-obtener producto (dedup atómica), get-or-create inventario, inserción de movimiento + actualización de `product_balance` en una transacción `batch`, lecturas públicas y agregados, en `backend/src/db/inventory-queries.ts`
- [X] T008 Montar las rutas nuevas (products, inventory, deliveries, distribution) en `backend/src/index.ts`
- [X] T009 [P] Construir `ProductPicker` (combobox accesible con buscador, opción "agregar nuevo") en `web/src/components/ProductPicker.tsx`
- [X] T010 [P] Construir `QuantityInput` (cantidad + unidad con conversión) en `web/src/components/QuantityInput.tsx`
- [X] T011 [P] Extender el cliente REST con los endpoints de la feature 3 en `web/src/lib/api.ts`

**Checkpoint**: Esquema y dominio listos — las historias pueden comenzar.

---

## Phase 3: User Story 1 - Productos específicos con buscador (Priority: P1) 🎯 MVP

**Goal**: Elegir productos del catálogo común con buscador al publicar/donar; reutilizar
productos existentes y agregar nuevos sin duplicar.

**Independent Test**: Buscar y agregar un producto existente (se reutiliza) y agregar "Arroz "
cuando existe "arroz" (no se duplica).

### Tests for User Story 1

- [X] T012 [P] [US1] Test de integración: crear-o-obtener producto deduplica por nombre normalizado (no duplica "Arroz "/"arroz") en `backend/tests/integration/products.test.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implementar `GET /products` (búsqueda), `POST /products` (crear-o-obtener) y `GET /categories` en `backend/src/routes/products.ts`
- [X] T014 [P] [US1] Integrar `ProductPicker` en publicar necesidad (`web/src/components/NeedForm.tsx`) y en donar (`web/src/pages/DonatePage.tsx`)
- [X] T015 [US1] Guardar `product_id` en `need_item`/`order_item` al seleccionar productos en `backend/src/routes/needs.ts` y `backend/src/routes/orders.ts`

**Checkpoint**: US1 funcional e independientemente testeable.

---

## Phase 4: User Story 2 - Inventario propio por usuario (Priority: P1) 🎯 MVP

**Goal**: Cada usuario tiene su inventario con saldos por producto y puede dar de alta unidades.

**Independent Test**: Agregar 5 kg de un producto y verificar saldo en unidad base y el
movimiento de alta.

### Tests for User Story 2

- [X] T016 [P] [US2] Test de integración: el alta actualiza el saldo (con conversión) y registra un movimiento en `backend/tests/integration/inventory.test.ts`

### Implementation for User Story 2

- [X] T017 [US2] Implementar `POST /inventory/items` (alta) y `GET /inventory/:ref` (saldos públicos) con get-or-create de inventario en `backend/src/routes/inventory.ts`
- [X] T018 [P] [US2] Construir `InventoryPage` (mi inventario: saldos + alta con `ProductPicker`/`QuantityInput`) en `web/src/pages/InventoryPage.tsx`

**Checkpoint**: US2 funcional.

---

## Phase 5: User Story 3 - Libro de movimientos inmutable y público (Priority: P1) 🎯 MVP

**Goal**: Libro append-only, público (sin login), con entregas reflejadas como salida+entrada;
identidad pública por nombre elegido/alias.

**Independent Test**: Consultar el libro de cualquier usuario sin sesión; verificar que no hay
forma de editar/borrar movimientos.

### Tests for User Story 3

- [X] T019 [P] [US3] Test de integración: libro append-only (sin endpoints de edición), lectura pública sin sesión, y una entrega crea salida+entrada en `backend/tests/integration/ledger.test.ts`

### Implementation for User Story 3

- [X] T020 [US3] Implementar `GET /inventory/:ref/ledger` (público) y asegurar que NO existen endpoints de update/delete de movimientos en `backend/src/routes/inventory.ts`
- [ ] T021 [P] [US3] Construir `PublicLedgerPage` (inventario y libro público de cualquiera, con alias/nombre público) en `web/src/pages/PublicLedgerPage.tsx`
- [X] T022 [US3] Implementar `PATCH /identity/public-name` y el alias no personal por defecto en las respuestas públicas, en `backend/src/routes/identity.ts`

**Checkpoint**: US1+US2+US3 → **MVP** (catálogo + inventario + libro público inmutable).

---

## Phase 6: User Story 4 - Bajas por consumo/daño/pérdida (Priority: P2)

**Goal**: La persona dueña marca unidades como consumida/rota/extraviada/estropeada;
descuenta y registra el motivo sin borrar historial.

**Independent Test**: Sobre un producto con saldo, marcar 1 unidad como consumida y verificar
el descuento y el movimiento de baja con motivo.

### Tests for User Story 4

- [X] T023 [P] [US4] Test de integración: la baja descuenta exactamente, registra el motivo e impide exceder el saldo en `backend/tests/integration/inventory-decrease.test.ts`

### Implementation for User Story 4

- [X] T024 [US4] Implementar `POST /inventory/items/:productId/decrease` (baja con motivo y control de saldo) en `backend/src/routes/inventory.ts`
- [X] T025 [P] [US4] Añadir la UI de baja (motivos) en `web/src/pages/InventoryPage.tsx`

**Checkpoint**: US4 funcional.

---

## Phase 7: User Story 5 - Integración con entregas y entrega directa (Priority: P2)

**Goal**: Las órdenes (feature 2) generan la custodia en dos pasos; el donante puede registrar
entregas directas en mano.

**Independent Test**: Confirmar recogida y entrega de una orden y verificar los movimientos
donante→transportista→necesitado; registrar una entrega directa y verificar el par de
movimientos.

### Tests for User Story 5

- [X] T026 [P] [US5] Test de integración: recogida/entrega de una orden crean la custodia en dos pasos en los inventarios correspondientes en `backend/tests/integration/custody.test.ts`

### Implementation for User Story 5

- [X] T027 [US5] Enganchar en `backend/src/routes/orders.ts`: al confirmar recogida (salida donante + entrada transportista) y al confirmar entrega (salida transportista + entrada necesitado)
- [X] T028 [US5] Implementar `POST /deliveries/direct` (entrega directa donante→necesitado, par de movimientos) en `backend/src/routes/deliveries.ts`
- [ ] T029 [P] [US5] Construir la UI de entrega directa (seleccionar destinatario/necesidad + productos) en `web/src/`

**Checkpoint**: US5 funcional.

---

## Phase 8: User Story 6 - Vista agregada de distribución (Priority: P2)

**Goal**: Totales por producto y por zona, y ranking de zonas con mayor demanda no cubierta.

**Independent Test**: Con inventarios y necesidades en varias zonas, verificar los agregados y
el ranking de demanda no cubierta.

### Tests for User Story 6

- [X] T030 [P] [US6] Test de integración: `distribution` agrega oferta/demanda por producto/zona y ordena por demanda no cubierta en `backend/tests/integration/distribution.test.ts`

### Implementation for User Story 6

- [X] T031 [US6] Implementar `GET /distribution` (agregados por producto/región + demanda no cubierta) en `backend/src/routes/distribution.ts`
- [X] T032 [P] [US6] Construir `DistributionPage` (totales por producto + ranking de zonas) en `web/src/pages/DistributionPage.tsx`

**Checkpoint**: US6 funcional.

---

## Phase 9: User Story 7 - Normalización del modelo de datos (Priority: P2)

**Goal**: Datos antiguos preservados y referenciando el catálogo (integridad), sin redundancias.

**Independent Test**: Verificar que `need_item`/`order_item` referencian `category`/`product`
con integridad y que ningún dato previo se perdió.

### Tests for User Story 7

- [X] T033 [P] [US7] Test de integración: la migración preserva los datos existentes y las referencias a `category` tienen integridad en `backend/tests/integration/normalization.test.ts`

### Implementation for User Story 7

- [X] T034 [US7] Backfill: poblar `category` desde los códigos en uso y vincular `need_item`/`order_item.category_code` como FK, preservando datos, en `backend/migrations/0003_catalogo_inventario.sql` (sección de backfill)
- [X] T035 [US7] Verificar/eliminar redundancias y unificar convenciones (nombres, tipos, marcas temporales); documentar el modelo normalizado en `specs/003-catalogo-productos-inventario/data-model.md`

**Checkpoint**: Modelo normalizado y verificado.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T036 [P] Tiempo real opcional del inventario (difundir movimientos vía Durable Object) o documentar el fallback por recarga en `backend/src/`
- [ ] T037 [P] Pase de accesibilidad WCAG 2.1 AA del `ProductPicker` y de las vistas públicas en `web/src/`
- [ ] T038 [P] Rendimiento: búsqueda de productos ≤1 s e índices de agregados; presupuesto 3G en `backend/` y `web/`
- [ ] T039 [P] Documentación: actualizar `README.md` y `quickstart.md` (catálogo, inventario, distribución)
- [ ] T040 Validar `quickstart.md` de extremo a extremo (local + smoke de despliegue)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — **BLOQUEA** todas las historias (crea esquema y dominio).
- **User Stories (Phase 3–9)**: tras la Fundación; luego en paralelo o por prioridad (US1→US2→US3 primero).
- **Polish (Phase 10)**: tras las historias deseadas.

### User Story Dependencies

- **US1 (P1)**: tras Fundación. Base del catálogo.
- **US2 (P1)**: tras Fundación. Inventario; usa productos (US1) pero testeable con datos sembrados.
- **US3 (P1)**: tras US2 (libro/saldos del inventario); completa el MVP.
- **US4 (P2)**: sobre el inventario (US2/US3).
- **US5 (P2)**: integra con órdenes (feature 2) e inventarios; entregas directas independientes.
- **US6 (P2)**: agrega sobre inventarios y necesidades; testeable con datos sembrados.
- **US7 (P2)**: la creación de tablas es Fundacional (T003); aquí se hace el backfill/integridad.

### Parallel Opportunities

- Setup: T002 [P].
- Fundación: T004, T005, T006, T009, T010, T011 [P] (T003 primero; T007/T008 dependen del esquema).
- Tras la Fundación, distintas historias en paralelo por distintas personas.

---

## Parallel Example: User Story 3 (libro público)

```bash
Task: "Test append-only/público en backend/tests/integration/ledger.test.ts"
Task: "PublicLedgerPage en web/src/pages/PublicLedgerPage.tsx"
# El endpoint del libro y el nombre público (mismo dominio backend) van secuenciales.
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Setup + Foundational (esquema + dominio + ProductPicker).
2. US1 (productos con buscador) → US2 (inventario) → US3 (libro público inmutable).
3. **DETENER y VALIDAR**: catálogo común sin duplicados + inventario por usuario + libro
   público e inmutable (transparencia).
4. Desplegar/demostrar (MVP de transparencia).

### Incremental Delivery

1. Fundación lista (incluye la migración de normalización del esquema).
2. + US1+US2+US3 → MVP → desplegar.
3. + US4 (bajas) → + US5 (entregas/custodia) → + US6 (distribución).
4. + US7 (backfill/integridad de datos antiguos) → + Polish.

### Parallel Team Strategy

1. Equipo completa Setup + Foundational.
2. Persona A → US1; Persona B → US2/US3; Persona C → US5; Persona D → US6; Persona E → US7.

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes.
- Inmutabilidad: `inventory_movement` es append-only; correcciones = nuevos movimientos.
- Transparencia: inventario y libro públicos; identidad por nombre/alias, nunca contacto ni
  ubicación exacta.
- Deduplicación por nombre normalizado único; nunca crear productos duplicados.
- La migración 0003 debe preservar TODOS los datos de features 1 y 2.
