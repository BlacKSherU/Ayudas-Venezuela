# Implementation Plan: Catálogo de Productos e Inventario Público

**Branch**: `003-catalogo-productos-inventario` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-catalogo-productos-inventario/spec.md`

## Summary

Añade un **catálogo común de productos** (dentro de categorías, con buscador y deduplicación
normalizada exacta), un **inventario por usuario** (donante, necesitado y transportista "en
tránsito") y un **libro de movimientos inmutable y público** (transparencia total). Los
movimientos cubren altas manuales, la **custodia en dos pasos** (donante→transportista→
necesitado) integrada con las órdenes (feature 2), entregas directas en mano, y **bajas** por
consumo/daño/pérdida. Cada producto tiene **unidad base** con conversiones entre unidades
compatibles. Incluye una vista agregada de **distribución** (oferta vs demanda por zona) y la
**normalización del modelo de datos** existente (categorías/productos como datos de referencia
con integridad, migración sin pérdida). Todo sobre el stack Cloudflare ya en producción.

## Technical Context

**Language/Version**: TypeScript 5.x (Worker y frontend); continúa el stack actual.

**Primary Dependencies**: Hono, D1, Durable Objects, KV, R2 (existentes). Frontend Vite +
React + lucide-react (iconos) + un selector con buscador (combobox accesible propio o ligero).
Sin dependencias nuevas pesadas.

**Storage**:
- D1: nuevas tablas `category`, `product`, `inventory`, `inventory_movement`,
  `product_balance` (saldo derivado, mantenido transaccionalmente). Normalización de
  `need_item`/`order_item` para referenciar `product`/`category`.
- KV: factores de conversión de unidades por dimensión (configurable) y catálogo de unidades.
- Durable Objects: reutiliza el patrón de tiempo real (MapRoom) para difundir cambios de
  inventario/distribución relevantes (opcional para el MVP; fallback a recarga).

**Testing**: Vitest + `@cloudflare/vitest-pool-workers` (catálogo+dedup, inventario, libro
append-only, custodia 2 pasos, conversiones, migración); Playwright (selector con buscador,
inventario público, vista de distribución, móvil).

**Target Platform**: Edge (Cloudflare Workers/Pages). Mobile-first, español.

**Performance Goals**:
- Búsqueda de productos con resultados en ≤1 s (SC-001: agregar en ≤15 s incluido escribir).
- Movimientos por entrega visibles en ambos inventarios en ≤5 s (SC-005).
- Vista de distribución útil en ≤3 s en 3G.

**Constraints**:
- **Inmutabilidad**: `inventory_movement` es append-only; sin endpoints de update/delete; las
  correcciones son nuevos movimientos.
- **Transparencia/privacidad**: inventarios y movimientos públicos (sin login); las partes se
  muestran por **nombre público elegido** o **alias no personal** por defecto; nunca contacto
  ni ubicación exacta.
- **Integridad**: productos/categorías como datos de referencia con FK; dedup por nombre
  normalizado único.
- **Migración sin pérdida** de los datos de features 1 y 2.
- Cloudflare-only; costo mínimo; WCAG 2.1 AA.

**Scale/Scope**: 7 historias de usuario; ~5 tablas nuevas + normalización; integración con
necesidades y órdenes existentes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Puerta | Estado |
|-----------|--------|--------|
| I. Dignidad y Protección | Movimientos públicos identifican por **nombre público elegido**/alias no personal; nunca contacto ni ubicación exacta; datos personales siguen protegidos | ✅ PASS |
| II. Acceso Directo Sin Intermediarios | Catálogo/inventario no añaden intermediarios; la custodia del transportista es ayuda opcional (feature 2); entregas directas soportadas | ✅ PASS |
| III. Mobile-First / Accesible | Selector con buscador accesible; español; WCAG AA; vistas públicas ligeras | ✅ PASS |
| IV. Confianza, Veracidad y Tiempo Real | **Libro inmutable y público** = auditoría/transparencia; movimientos append-only; integración automática con entregas | ✅ PASS (refuerza el principio) |
| V. Abierto, Público y Gratuito | Inventario y libro públicos sin login; catálogo abierto; gratis | ✅ PASS |
| Restricciones de Plataforma | Cloudflare D1 + KV + DO; migración versionada; costo mínimo | ✅ PASS |
| Interacción del Asistente | Decisiones del usuario resueltas por interfaz estructurada | ✅ PASS |

**Resultado**: Sin violaciones. El catálogo abierto **sin moderación** (decisión del usuario)
se documenta como riesgo conocido (FR-003), mitigable luego sin cambio estructural.

## Project Structure

### Documentation (this feature)

```text
specs/003-catalogo-productos-inventario/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
└── tasks.md   (en /speckit-tasks)
```

### Source Code (repository root) — extiende features 1 y 2

```text
backend/
├── src/
│   ├── routes/
│   │   ├── products.ts        # Buscar/crear productos (dedup normalizado), categorías
│   │   ├── inventory.ts       # Inventario propio: altas, bajas, consulta pública, libro
│   │   ├── deliveries.ts      # Entrega directa donante→necesitado (manual)
│   │   └── distribution.ts    # Vista agregada oferta vs demanda por zona
│   ├── domain/
│   │   ├── normalize.ts       # Normalización de nombres (minúsculas, trim, sin acentos)
│   │   ├── units.ts           # Unidades, dimensiones y conversiones a unidad base
│   │   └── ledger.ts          # Reglas del libro (tipos de movimiento, append-only, saldos)
│   ├── db/
│   │   └── inventory-queries.ts  # Productos, inventario, movimientos, saldos, agregados
│   └── routes/orders.ts       # (extendido) crea movimientos en recogida y entrega
├── migrations/
│   └── 0003_catalogo_inventario.sql  # Tablas nuevas + normalización + public_name + datos
└── ...

web/
├── src/
│   ├── components/
│   │   ├── ProductPicker.tsx   # Selector con buscador (combobox accesible) reutilizable
│   │   └── QuantityInput.tsx   # Cantidad + unidad (con conversión)
│   ├── pages/
│   │   ├── InventoryPage.tsx   # Mi inventario: saldos, altas, bajas, libro
│   │   ├── PublicLedgerPage.tsx# Libro público / inventario de cualquiera
│   │   └── DistributionPage.tsx# Vista de distribución oferta vs demanda
│   └── lib/api.ts              # (extendido) endpoints de productos/inventario/distribución
└── ...
```

**Structure Decision**: Extiende los despliegues existentes (Worker + Pages). El **libro de
movimientos** (`inventory_movement`) es la fuente de verdad inmutable; los **saldos**
(`product_balance`) se mantienen transaccionalmente junto a cada movimiento para lecturas
rápidas y públicas. El **selector con buscador** (`ProductPicker`) se reutiliza en publicar,
donar y preparar órdenes. La **normalización** se hace en una única migración `0003` que
preserva los datos de features 1 y 2.

## Complexity Tracking

> No aplica: sin violaciones de la constitución que requieran justificación. La inmutabilidad,
> la publicidad del libro y la normalización están alineadas con los principios (transparencia,
> veracidad, integridad).
