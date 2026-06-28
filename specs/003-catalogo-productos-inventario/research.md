# Phase 0 Research: Catálogo de Productos e Inventario Público

**Fecha**: 2026-06-28 | **Feature**: 003-catalogo-productos-inventario

## D1. Catálogo de productos y deduplicación

- **Decision**: Tabla `product` con `name` (canónico) y `normalized_name` con **índice único**.
  La normalización (minúsculas, `trim`, colapso de espacios, eliminación de acentos/diacríticos)
  se hace en el servidor. Crear-o-obtener: al agregar un producto se normaliza y se hace
  `INSERT ... ON CONFLICT(normalized_name) DO NOTHING` y se devuelve el existente.
- **Rationale**: Cumple FR-004 (dedup normalizada exacta) de forma simple y atómica; el índice
  único garantiza unicidad incluso ante carreras de concurrencia.
- **Alternatives considered**: Coincidencia difusa (typos): descartada por el usuario (riesgo de
  fusionar productos distintos). Dedup en cliente: insegura; el servidor es la autoridad.

## D2. Unidades de medida y conversiones

- **Decision**: Cada `product` tiene `base_unit` y `dimension` (`masa` | `volumen` | `conteo`).
  Una tabla/registro KV de **unidades** define el factor a la unidad base por dimensión (masa
  base = gramo: kg=1000, g=1; volumen base = mililitro: l=1000, ml=1; conteo base = unidad).
  Al registrar una cantidad, el usuario elige una unidad **compatible** con la dimensión del
  producto; el sistema convierte y **almacena el saldo en la unidad base**. El movimiento guarda
  cantidad base + unidad declarada + factor (trazabilidad).
- **Rationale**: Cumple FR-027 (unidad por producto + conversiones del mismo tipo, p. ej.
  gramos↔kilos) sin ambigüedad y con saldos consistentes.
- **Alternatives considered**: Unidades genéricas: más simple pero ambiguo para graneles
  (rechazado). Librería de unidades externa: innecesaria; los factores son triviales y fijos.

## D3. Libro de movimientos inmutable y saldos

- **Decision**: `inventory_movement` es **append-only** (sin endpoints de update/delete). Los
  **saldos** se mantienen en `product_balance` (por inventario+producto) actualizados en la
  **misma transacción `batch`** que inserta el movimiento. El libro es la fuente de verdad; el
  saldo es una proyección para lectura rápida y pública. Reconstruible sumando movimientos.
- **Rationale**: Inmutabilidad (FR-009) + lecturas públicas rápidas (FR-008/010). La
  consistencia se garantiza al escribir movimiento y saldo juntos.
- **Alternatives considered**: Calcular saldo on-the-fly con SUM: simple pero costoso a escala
  para vistas públicas; se prefiere la proyección mantenida.

## D4. Custodia en dos pasos e integración con órdenes

- **Decision**: Modelar la entrega como **dos movimientos emparejados** por evento:
  (1) al confirmar **recogida** (feature 2): `salida` del donante + `entrada` al inventario "en
  tránsito" del transportista; (2) al confirmar **entrega**: `salida` del transportista +
  `entrada` al necesitado. Se enganchan en `orders.ts` (pickup/deliver). Las **entregas
  directas** (sin orden) generan un único par donante→necesitado.
- **Rationale**: Cumple FR-011/016/025/026; trazabilidad total de la cadena solicitada.
- **Alternatives considered**: Un solo movimiento donante→necesitado: más simple pero pierde la
  custodia del transportista (rechazado por el usuario).

## D5. Identidad pública (nombre elegido / alias)

- **Decision**: Añadir `public_name` (opcional) a `identity`. En vistas públicas se muestra el
  `public_name` si existe; si no, un **alias derivado y estable** no personal (p. ej.
  "Donante " + sufijo del id). Nunca se exponen contacto ni ubicación exacta.
- **Rationale**: Cumple FR-015 (nombre elegido, real o seudónimo; protección por defecto).
- **Alternatives considered**: Mostrar identidad real: rechazado (Principio I). Solo alias:
  el usuario pidió poder elegir nombre.

## D6. Vista de distribución (oferta vs demanda)

- **Decision**: Agregados por **producto** y por **región**: demanda = cantidades pendientes de
  necesidades por región; oferta = saldos disponibles (inventarios de donantes) por producto.
  "A dónde distribuir" = ranking de regiones con mayor **demanda no cubierta** (demanda −
  oferta asignable). Consultas D1 con `GROUP BY` indexadas; sin servicio externo.
- **Rationale**: Cumple FR-018/019 de forma barata y clara; usa la región ya existente (zona
  ofuscada), sin exponer ubicación exacta.
- **Alternatives considered**: Optimización de distribución (asignación óptima): fuera de
  alcance del MVP; se difiere. El ranking por demanda no cubierta es suficiente y accionable.

## D7. Normalización del modelo de datos (migración 0003)

- **Decision**: Introducir `category` y `product` como tablas de referencia. `need_item` y
  `order_item` obtienen `product_id` (opcional) y mantienen `category_code` como **FK** a
  `category` (sembrada con los códigos actuales). Se añaden `inventory`, `inventory_movement`,
  `product_balance` y `identity.public_name`. La migración **preserva** los datos existentes
  (no borra filas; rellena referencias) y unifica representaciones equivalentes.
- **Rationale**: Cumple FR-021–024 reduciendo el "desorden" (texto suelto → referencias con
  integridad) sin pérdida de datos.
- **Alternatives considered**: Reescritura total del esquema: riesgosa para datos en producción;
  se prefiere una migración aditiva + backfill. Mover categorías de KV a D1: sí, como parte de
  la normalización (fuente única con integridad), conservando KV solo para parámetros.

## D8. Selector con buscador (frontend)

- **Decision**: Componente `ProductPicker` (combobox accesible): input de búsqueda con
  resultados del catálogo (debounced), opción "agregar nuevo" si no existe, y selección
  múltiple. Reutilizado en publicar necesidad, donar y preparar orden. Accesible (teclado,
  ARIA), mobile-first.
- **Rationale**: Cumple FR-002 y SC-001 (encontrar/agregar en ≤15 s) con una sola pieza
  reutilizable; evita duplicar UI.
- **Alternatives considered**: Librería de combobox pesada: innecesaria para el presupuesto 3G;
  un componente propio ligero basta.

## Resumen de decisiones

| # | Tema | Decisión |
|---|------|----------|
| D1 | Catálogo/dedup | `normalized_name` único; crear-o-obtener atómico |
| D2 | Unidades | unidad base + dimensión por producto; conversión a base (KV factores) |
| D3 | Libro/saldos | `inventory_movement` append-only + `product_balance` mantenido |
| D4 | Custodia | dos movimientos por evento (recogida/entrega); directas en un par |
| D5 | Identidad pública | `public_name` o alias no personal por defecto |
| D6 | Distribución | agregados por producto/región; ranking por demanda no cubierta |
| D7 | Normalización | migración 0003 aditiva + backfill; categorías/productos con integridad |
| D8 | Buscador | `ProductPicker` accesible reutilizable |

**Estado**: Incógnitas resueltas. Listo para Fase 1.
