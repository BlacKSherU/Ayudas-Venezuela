# Quickstart — Feature 3: Catálogo de Productos e Inventario Público

**Feature**: 003-catalogo-productos-inventario. Extiende el entorno de features 1 y 2.

## 1. Migración (normalización + inventario)

```bash
cd backend
# Crea category/product/inventory/inventory_movement/product_balance, añade product_id e
# identity.public_name, y siembra categorías + factores de unidad. Preserva datos existentes.
wrangler d1 migrations apply ayuda-venezuela --local      # local
# wrangler d1 migrations apply ayuda-venezuela --remote    # producción
```

Factores de unidad en KV (configurable):
```bash
wrangler kv key put --binding CONFIG unit_factors '{"masa":{"base":"gramo","units":{"gramo":1,"kg":1000}},"volumen":{"base":"mililitro","units":{"ml":1,"litro":1000}},"conteo":{"base":"unidad","units":{"unidad":1,"docena":12}}}'
```

## 2. Probar el flujo (local)

1. **Catálogo**: en publicar/donar, usa el **buscador de productos**; agrega "arroz" (si no
   existe, se crea). Repite con "Arroz " y verifica que NO se duplica.
2. **Inventario propio**: agrega 5 kg de arroz a tu inventario → saldo 5000 g; ve el movimiento
   de `alta` en tu libro.
3. **Baja**: marca 1 kg como "consumido" → saldo 4000 g; queda movimiento `baja` con motivo,
   sin borrar el historial.
4. **Entrega directa**: como donante, registra una entrega de 2 kg a un necesitado → aparece
   salida en tu inventario y entrada en el del necesitado, ambos públicos.
5. **Orden (feature 2)**: confirma recogida y entrega de una orden con productos y verifica la
   custodia en dos pasos (donante→transportista→necesitado) en los libros.
6. **Público**: abre el inventario/libro de cualquier usuario sin iniciar sesión.
7. **Distribución**: abre la vista y verifica totales por producto y el ranking de zonas con
   mayor demanda no cubierta.

## 3. Pruebas

```bash
cd backend && npm test     # dedup, unidades/conversión, libro append-only, custodia 2 pasos, migración
cd ../web && npm run test:e2e   # selector con buscador, inventario público, distribución (móvil)
```

## 4. Verificación de constitución (checklist rápido)

- [ ] Agregar un producto con otra grafía no crea duplicado.
- [ ] Ningún endpoint permite editar/borrar movimientos (inmutable).
- [ ] El inventario y el libro son visibles **sin iniciar sesión**.
- [ ] Los movimientos muestran **nombre público/alias**, nunca contacto ni ubicación exacta.
- [ ] Una baja descuenta exactamente y deja registro con motivo.
- [ ] La confirmación de una entrega refleja la custodia en dos pasos.
- [ ] La migración preserva los datos de features 1 y 2.

## 5. Despliegue

```bash
cd backend && wrangler d1 migrations apply ayuda-venezuela --remote && wrangler deploy
cd ../web && npm run build && wrangler pages deploy dist --project-name ayuda-venezuela --branch main
```
