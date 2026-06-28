# Contrato REST API — Feature 3 (catálogo, inventario, distribución)

**Base**: `/api/v1`. Extiende los contratos previos. JSON. Lecturas de catálogo, inventario y
libro son **públicas** (sin sesión). Escrituras requieren sesión y ser dueño del inventario.

## Catálogo de productos

### GET /api/v1/products?search=&category=
Busca productos del catálogo (deduplicado) por texto y categoría. Público.
```json
{ "products": [ { "id": "ulid", "name": "Arroz", "categoryCode": "alimentos",
                  "dimension": "masa", "baseUnit": "gramo" } ] }
```

### POST /api/v1/products
Crea un producto si no existe (crear-o-obtener por nombre normalizado). **Requiere sesión.**
```json
{ "name": "Arroz", "categoryCode": "alimentos", "dimension": "masa", "baseUnit": "gramo" }
```
Respuesta `200/201`: el producto (existente o nuevo). Nunca crea duplicados (FR-004).

### GET /api/v1/categories
Categorías de referencia (desde D1 tras la normalización). Público.

## Inventario (público para leer; dueño para escribir)

### GET /api/v1/inventory/{identityRef}
Inventario público de un usuario (por alias/id público): saldos por producto + nombre público.
```json
{ "owner": { "publicName": "Donante A23" },
  "balances": [ { "product": { "id": "ulid", "name": "Arroz", "baseUnit": "gramo" },
                  "qtyBase": 5000 } ] }
```

### GET /api/v1/inventory/{identityRef}/ledger?product=&limit=
Libro de movimientos público (append-only) del usuario.
```json
{ "movements": [ { "id": "ulid", "type": "entrada_entrega", "direction": "in",
                   "product": { "name": "Arroz" }, "qtyBase": 5000,
                   "declaredQty": 5, "declaredUnit": "kg",
                   "counterparty": { "publicName": "Donante A23" },
                   "reason": null, "at": 1750000000000 } ] }
```

### POST /api/v1/inventory/items
Alta manual de unidades al inventario propio. **Requiere sesión.**
```json
{ "productId": "ulid", "declaredQty": 5, "declaredUnit": "kg" }
```
`200` → saldo actualizado + movimiento `alta`. Convierte a unidad base.

### POST /api/v1/inventory/items/{productId}/decrease
Baja por consumo/daño/pérdida del inventario propio. **Requiere sesión.**
```json
{ "declaredQty": 1, "declaredUnit": "kg", "reason": "consumido" }
```
`200` → descuenta y registra movimiento `baja`. `422 INSUFFICIENT` si excede el saldo (FR-013).

## Entrega directa (donante → necesitado, sin orden)

### POST /api/v1/deliveries/direct
Registra una entrega en mano. **Requiere sesión (donante).** El destinatario se indica por su
referencia pública o por la necesidad que atiende.
```json
{ "recipientRef": "ulid|alias", "needId": "ulid|null",
  "items": [ { "productId": "ulid", "declaredQty": 5, "declaredUnit": "kg" } ] }
```
`201` → crea movimientos emparejados (salida donante + entrada necesitado), públicos.

## Identidad pública

### PATCH /api/v1/identity/public-name
Fija/actualiza el nombre público propio (real o seudónimo). **Requiere sesión.**
```json
{ "publicName": "Fundación X" }
```

## Distribución (agregado público)

### GET /api/v1/distribution?product=&region=
Vista agregada de oferta vs demanda por producto y región. Público.
```json
{
  "byProduct": [ { "product": { "name": "Arroz" }, "supplyBase": 120000, "demandBase": 300000 } ],
  "unmetByRegion": [ { "regionCode": "LAR", "demandUnmet": 180000 } ]
}
```

## Integración con órdenes (feature 2)

- Al confirmar **recogida** de una orden: el sistema crea `salida_recogida` (donante) +
  `entrada_recogida` (transportista en tránsito) por cada producto de la orden.
- Al confirmar **entrega**: `salida_entrega` (transportista) + `entrada_entrega` (necesitado).
- Las órdenes/necesidades referencian `productId` cuando se detallan productos (FR-017).

## Inmutabilidad

- NO existen endpoints de edición/borrado de movimientos. Las correcciones se hacen con nuevos
  movimientos (p. ej. una `baja` o una nueva `alta`). El libro es la fuente de verdad pública.
