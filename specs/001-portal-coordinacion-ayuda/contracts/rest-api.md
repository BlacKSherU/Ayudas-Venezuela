# Contrato REST API — Worker (Backend)

**Feature**: 001-portal-coordinacion-ayuda | **Base**: `https://<worker-host>/api/v1`

Formato: JSON. Autenticación: cookie de sesión firmada (`session`) emitida tras verificar la
identidad ligera. Endpoints de lectura del mapa son **públicos** (sin sesión). Las respuestas
de error usan `{ "error": { "code": string, "message": string } }`.

## Convenciones

- Coordenadas devueltas al público están **ofuscadas** a zona (~1 km).
- Rate limiting: `429` con cabecera `Retry-After` cuando se excede el límite.
- Validación con Zod; cuerpos inválidos → `400 VALIDATION_ERROR`.
- CORS restringido al dominio de Pages; `credentials: include` para la cookie de sesión.

## Identidad ligera

### POST /api/v1/identity/request-code
Solicita un código OTP al canal indicado. Público.

Request:
```json
{ "channel": "email", "contact": "persona@ejemplo.com" }
```
Response `202`:
```json
{ "requestId": "ulid", "expiresInSec": 600 }
```

### POST /api/v1/identity/verify
Verifica el OTP y abre sesión (cookie `session`). Público.

Request:
```json
{ "requestId": "ulid", "code": "123456" }
```
Response `200` (set-cookie `session`):
```json
{ "identityId": "ulid" }
```

### POST /api/v1/identity/logout
Cierra la sesión. Requiere sesión. Response `204`.

## Necesidades (mapa)

### GET /api/v1/needs
Lista necesidades para el mapa por **bounding box** y filtros. Público.

Query params:
- `bbox` (req.): `minLng,minLat,maxLng,maxLat`
- `status` (opc.): `pendiente` (default para mapa activo) | `comprometida` | `entregada`
- `category` (opc.): código de insumo
- `urgency` (opc.): `alta|media|baja`
- `limit` (opc., default 200, máx 500)

Response `200`:
```json
{
  "needs": [
    {
      "id": "ulid",
      "status": "pendiente",
      "urgency": "alta",
      "zone": { "lat": 10.49, "lng": -66.90 },
      "regionCode": "DC",
      "items": [{ "categoryCode": "agua", "quantity": "20 L" }],
      "note": "Familia con 2 niños",
      "contactPublic": null,
      "updatedAt": 1750000000000
    }
  ],
  "count": 1
}
```

### GET /api/v1/needs/{id}
Detalle público de una necesidad (datos ofuscados). Público. `404` si no existe/oculta.

### POST /api/v1/needs
Crea una necesidad. **Requiere sesión** (identidad ligera). La ubicación enviada se
**ofusca** del lado del servidor antes de persistirse.

Request:
```json
{
  "urgency": "alta",
  "location": { "lat": 10.4955, "lng": -66.9036 },
  "items": [{ "categoryCode": "agua", "quantity": "20 L" }],
  "note": "Familia con 2 niños",
  "contactPublic": "WhatsApp +58...",
  "contactPublicConsent": true
}
```
Reglas: `contactPublic` solo se acepta con `contactPublicConsent=true` (FR-016/FR-011).
Response `201`: objeto necesidad (vista pública) + `ownerView: true`.

### PATCH /api/v1/needs/{id}
Edita una necesidad propia (note, items, urgency, contactPublic). **Requiere ser titular**
(`owner_identity_id == session`). `403` si no es titular. Response `200`.

### DELETE /api/v1/needs/{id}
Elimina/anonimiza una necesidad propia. **Requiere ser titular**. Response `204`.

### POST /api/v1/needs/{id}/resolve
Marca como `entregada`. Permitido al **titular** o al **donante comprometido**. Response `200`.

## Compromisos (emparejamiento directo)

### POST /api/v1/needs/{id}/commit
La persona donante se compromete con la necesidad. **Requiere sesión**. Transición
`pendiente → comprometida` de forma **exclusiva**.

Response `200` (éxito):
```json
{ "needId": "ulid", "status": "comprometida", "commitmentId": "ulid" }
```
Response `409 ALREADY_COMMITTED` si ya fue tomada (FR-005 / US3 escenario 3):
```json
{ "error": { "code": "ALREADY_COMMITTED", "message": "Necesidad ya tomada" } }
```

### POST /api/v1/needs/{id}/release
El donante comprometido cancela su compromiso → vuelve a `pendiente`. Requiere ser el
donante comprometido. Response `200`.

## Anti-abuso

### POST /api/v1/needs/{id}/report
Reporte comunitario. Público (limitado por IP). Response `202`.
```json
{ "reason": "duplicado" }
```

## Catálogo

### GET /api/v1/categories
Lista de tipos de insumo (desde KV). Público. Response `200`:
```json
{ "categories": [{ "code": "agua", "labelEs": "Agua", "icon": "💧" }] }
```

## Notas de implementación
- Toda transición de estado escribe `audit_event` y notifica al Durable Object de la región
  para difusión por WebSocket (ver `realtime-ws.md`).
- Los barridos de auto-liberar (12 h) y expirar (30 d) los ejecutan alarmas de DO + un Cron
  de respaldo.
