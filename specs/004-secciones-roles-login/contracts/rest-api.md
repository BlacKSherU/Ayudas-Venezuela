# Contrato REST API — Feature 4 (centros de acopio)

**Base**: `/api/v1`. La mayor parte de la feature es frontend (navegación/login/roles) y no
requiere endpoints nuevos. El único añadido backend es **centros de acopio**.

## Centros de acopio

### GET /api/v1/centers?bbox=
Lista centros activos por bounding box (para el mapa). Público.
```json
{ "centers": [ { "id": "ulid", "name": "Centro Cabudare",
                 "location": { "lat": 10.03, "lng": -69.27 },
                 "regionCode": "LAR", "note": "L-V 8am-5pm" } ] }
```

### POST /api/v1/centers
Registra un centro. **Requiere sesión.** Abierto + anti-abuso (límite de tasa).
```json
{ "name": "Centro Cabudare", "location": { "lat": 10.0312, "lng": -69.2712 }, "note": "L-V 8-5" }
```
- La ubicación se guarda **exacta** (es un punto público). `201` → el centro creado.

### GET /api/v1/centers/mine
Centros del usuario autenticado. **Requiere sesión.**

### PATCH /api/v1/centers/:id
Edita un centro propio (nombre, ubicación, nota). **Requiere ser dueño.**

### DELETE /api/v1/centers/:id
Elimina un centro propio. **Requiere ser dueño.**

### POST /api/v1/centers/:id/report
Reporte comunitario anti-abuso. Público (limitado por IP). Al superar un umbral, el centro pasa
a `oculto`.

## Integración con donaciones (feature 2/3)

- Al donar/publicar una orden, el donante MAY elegir uno de **sus centros**; entonces el punto
  de recogida = ubicación del centro. Si no elige centro, sigue el flujo individual (marca el
  punto de recogida como hasta ahora). Sin cambios en el contrato de órdenes salvo un
  `centerId` opcional en la creación.

## Notas de frontend (sin endpoints)

- **Login único**: usa los endpoints de identidad existentes (`/identity/request-code`,
  `/identity/verify`, `/identity/logout`, `/identity/me`).
- **Selector de rol**: usa `/support/me` (rol del voluntario) y `/catalog/roles`.
- **Vistas públicas en el Mapa**: usan `/distribution` e `/inventory/:ref/ledger` existentes.
