# Phase 1 Data Model: Catálogo de Productos e Inventario Público

**Fecha**: 2026-06-28 | **Feature**: 003 | **Almacén**: D1 (relacional) + KV (factores de unidad)

Convenciones: ids `TEXT` (UUID/ULID); marcas temporales epoch ms (`INTEGER`). Cantidades en la
**unidad base** del producto (`INTEGER` o `REAL` según dimensión). El libro de movimientos es
**append-only** (inmutable). Todo lo de inventario es **público**.

## Tablas nuevas

### category (datos de referencia — normalización)

| Campo | Tipo | Reglas |
|-------|------|--------|
| code | TEXT PK | Código estable (agua, alimentos, …) — migrado desde KV/uso actual |
| label_es | TEXT | Nombre en español |
| kind | TEXT | `fisico` \| `humano` |

### product (catálogo común, deduplicado)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| name | TEXT | Nombre canónico mostrado (p. ej. "Arroz") |
| normalized_name | TEXT | Normalizado (minúsculas, sin acentos, sin espacios extra) |
| category_code | TEXT FK → category.code | Categoría a la que pertenece |
| dimension | TEXT | `masa` \| `volumen` \| `conteo` |
| base_unit | TEXT | Unidad base (gramo, mililitro, unidad) |
| created_by | TEXT FK → identity.id | Quién lo agregó |
| created_at | INTEGER | epoch ms |

- **Único**: `normalized_name` (deduplicación, FR-004). Índice: (`category_code`).

### inventory (inventario por usuario)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| owner_identity_id | TEXT FK → identity.id | Dueño |
| role | TEXT | `donante` \| `necesitado` \| `transportista` (este último es "en tránsito") |
| created_at | INTEGER | epoch ms |

- **Único**: (`owner_identity_id`, `role`). Una persona puede tener inventario en distintos
  roles (p. ej. transportista en tránsito + donante).

### product_balance (saldo proyectado, mantenido transaccionalmente)

| Campo | Tipo | Reglas |
|-------|------|--------|
| inventory_id | TEXT FK → inventory.id | |
| product_id | TEXT FK → product.id | |
| qty_base | REAL | Saldo actual en unidad base (≥ 0) |
| updated_at | INTEGER | epoch ms |

- **PK compuesta**: (`inventory_id`, `product_id`). Derivable del libro; se mantiene para
  lecturas rápidas y públicas.

### inventory_movement (libro mayor — inmutable, público)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID (orden cronológico) |
| inventory_id | TEXT FK → inventory.id | Inventario afectado |
| product_id | TEXT FK → product.id | Producto |
| type | TEXT | `alta` \| `salida_recogida` \| `entrada_recogida` \| `salida_entrega` \| `entrada_entrega` \| `entrega_directa_salida` \| `entrada_directa` \| `baja` |
| direction | TEXT | `in` \| `out` (signo sobre el saldo) |
| qty_base | REAL | Cantidad en unidad base (> 0) |
| declared_unit | TEXT | Unidad que declaró la persona (p. ej. "kg") |
| declared_qty | REAL | Cantidad declarada en esa unidad |
| reason | TEXT NULL | Motivo de baja: `consumido`\|`roto`\|`extraviado`\|`estropeado` |
| counterparty_inventory_id | TEXT NULL FK → inventory.id | Contraparte (en entregas) |
| order_id | TEXT NULL | Orden de la feature 2 que originó el movimiento (si aplica) |
| at | INTEGER | epoch ms |

- **Append-only**: sin update ni delete por la API. Índices: (`inventory_id`, `at`),
  (`product_id`), (`order_id`). Correcciones = nuevos movimientos.

## Cambios a tablas existentes (normalización)

### identity (ampliada)

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| public_name | TEXT NULL | Nombre público elegido; si NULL se usa alias no personal |

### need_item / order_item (ampliadas — integridad)

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| product_id | TEXT NULL FK → product.id | Producto específico (opcional; FR-005) |

- `category_code` pasa a ser **FK** a `category.code` (sembrada con los códigos actuales). Datos
  antiguos se preservan; `product_id` queda NULL hasta que se detalle.

## Unidades y conversiones (KV `unit_factors`)

```json
{
  "masa":    { "base": "gramo",    "units": { "gramo": 1, "kg": 1000 } },
  "volumen": { "base": "mililitro","units": { "ml": 1, "litro": 1000 } },
  "conteo":  { "base": "unidad",   "units": { "unidad": 1, "docena": 12, "caja": 1 } }
}
```

- Al registrar `declared_qty` en `declared_unit`, `qty_base = declared_qty * factor(unit)`.
- Solo se permiten unidades de la **misma dimensión** que el producto.

## Reglas e invariantes

- Una **baja** requiere `qty_base ≤ product_balance.qty_base` (FR-013); descuenta y registra
  movimiento `baja` con `reason`.
- Una **entrega** (orden o directa) genera movimientos emparejados (out/in) que dejan el total
  global invariante (lo que sale de uno entra en otro).
- Toda escritura de movimiento actualiza `product_balance` en la misma transacción `batch`.
- Solo el **dueño** del inventario crea altas/bajas; cualquiera **lee** (público).
- Vistas públicas muestran `public_name`/alias; nunca contacto ni ubicación exacta.

## Máquina de movimientos por entrega (custodia 2 pasos)

```text
Orden (feature 2):
  recogida confirmada → [donante: salida_recogida] + [transportista(tránsito): entrada_recogida]
  entrega  confirmada → [transportista: salida_entrega] + [necesitado: entrada_entrega]

Entrega directa (sin orden):
  registro → [donante: entrega_directa_salida] + [necesitado: entrada_directa]
```

## Relaciones (resumen)

```text
category 1──N product 1──N product_balance N──1 inventory N──1 identity
product 1──N inventory_movement N──1 inventory
inventory_movement N──1 inventory (counterparty)
product 1──N need_item / order_item   (referencia opcional)
```

## Distribución (derivada, vista pública)

- **Demanda** por (producto, región) = Σ cantidades pendientes en necesidades.
- **Oferta** por (producto, región) = Σ `product_balance.qty_base` de inventarios de donantes.
- **A dónde distribuir** = regiones ordenadas por demanda no cubierta (demanda − oferta).
