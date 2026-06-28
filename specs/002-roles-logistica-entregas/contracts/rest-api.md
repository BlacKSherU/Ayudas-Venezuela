# Contrato REST API — Feature 2 (logística y roles)

**Base**: `/api/v1`. Extiende el contrato de la feature 1. JSON salvo subida de medios.
Autenticación por cookie de sesión (identidad ligera). Errores: `{ error: { code, message } }`.
Las respuestas **nunca** incluyen cédula, ubicación exacta de terceros ni rastreo público.

## Personal de apoyo

### POST /api/v1/support/register
Registra el perfil de personal de apoyo. **Requiere sesión.**
```json
{ "roleCode": "transportista", "cedulaNumber": "V-12345678", "cedulaPhotoMediaKey": "<key>" }
```
- La foto se sube antes vía `POST /media` (kind=cedula, cifrada). El número se cifra en el
  servidor. Respuesta `201`: `{ "supportId": "ulid", "status": "activo" }` (auto-aprobación).

### GET /api/v1/support/me
Perfil de apoyo propio (sin exponer cédula): rol, estado, reputación. Requiere sesión.

## Medios (R2)

### POST /api/v1/media
Sube un medio (multipart o binario). **Requiere sesión.** Valida tipo y tamaño (foto ≤5 MB;
video ≤15 s/≤25 MB). `kind` ∈ {cedula, evidencia, prueba_entrega}. Para `cedula` el contenido
se cifra. Respuesta `201`: `{ "key": "<r2-key>", "contentType": "...", "size": 12345 }`.

### GET /api/v1/media/{key}
Descarga controlada: solo si el solicitante es parte autorizada (dueño, partes de la orden, o
auditoría). `403` si no. La cédula nunca se sirve salvo flujo de auditoría.

## Órdenes de entrega

### POST /api/v1/orders
El donante marca recursos listos y publica la orden (desde una donación comprometida).
**Requiere sesión (donante).**
```json
{ "needId": "ulid", "pickupLocation": { "lat": 10.49, "lng": -66.90 } }
```
- El servidor ofusca la zona de recogida (pública) y cifra la exacta. Genera `pickup_code`.
  Respuesta `201`: orden (vista pública) + `pickupCode` (se muestra solo al donante).

### GET /api/v1/orders
Lista órdenes **disponibles** cercanas por bbox/región y filtros (categoría/urgencia).
Público o con sesión de apoyo. Respuesta: zonas aproximadas, recursos, sin direcciones exactas.

### POST /api/v1/orders/{id}/take
El personal de apoyo toma la orden (exclusivo). **Requiere sesión de apoyo activa (no
suspendida).** `409 ALREADY_TAKEN` si ya fue tomada. Al tomar, se revelan al asignado las
**direcciones exactas** (descifradas) de recogida y entrega.

### POST /api/v1/orders/{id}/pickup
Confirma la recogida introduciendo el **código del donante**.
```json
{ "pickupCode": "482917" }
```
`200` → estado `recogida/en_camino`. `422 BAD_CODE` si no coincide.

### POST /api/v1/orders/{id}/deliver
Confirma la entrega con el **código del necesitado** (+ foto de prueba opcional).
```json
{ "dropoffCode": "104friends", "proofMediaKey": "<key|null>" }
```
`200` → estado `entregada`; marca la `need` atendida; difunde cierre. `422 BAD_CODE` si no.

### POST /api/v1/orders/{id}/release
El transportista libera la orden → vuelve a `disponible`. Requiere ser el asignado.

### GET /api/v1/orders/{id}
Detalle de la orden para una parte autorizada (donante, necesitado o asignado), con el nivel
de detalle que corresponda a su rol (el asignado ve direcciones exactas; las partes ven ETA).

## Incidencias

### POST /api/v1/orders/{id}/incidents
Reporta una incidencia. **Requiere ser el transportista asignado.**
```json
{ "type": "robo", "description": "...", "mediaKey": "<key>" }
```
- `mediaKey` obligatorio para tipos que lo requieren (robo/daño). `200` → registra y puede
  cambiar la orden a `con_incidencia`; notifica a las partes. Robo/daño total puede reabrir la
  necesidad.

## Dashboards

### GET /api/v1/dashboard/donor
Panel del donante. **Requiere sesión.** Query: `lat,lng` (ubicación aproximada del donante).
```json
{
  "needs": [{ "id": "ulid", "urgency": "alta", "distanceKm": 3.2, "items": [...], "zone": {...} }],
  "topRequested": [{ "categoryCode": "agua", "count": 42 }],
  "metrics": { "total": 120, "byCategory": {...}, "byUrgency": {...} }
}
```

### GET /api/v1/dashboard/recipient
Panel del necesitado. **Requiere sesión.** Devuelve sus necesidades y entregas en curso:
```json
{
  "deliveries": [{
    "orderId": "ulid", "status": "en_camino", "etaMinutes": 14,
    "items": [...], "support": { "roleCode": "transportista", "ratingAvg": 4.8 }
  }]
}
```
- No expone cédula ni identidad del transportista; sí su rol y reputación.

## Valoraciones / reputación

### POST /api/v1/orders/{id}/rate
Donante o necesitado valora al apoyo tras la entrega.
```json
{ "score": 5, "comment": "Rápido y amable" }
```
`200` → recalcula reputación; puede suspender automáticamente si cae bajo el umbral.

## Recursos humanos (auto-despliegue)

### POST /api/v1/needs/{id}/self-deploy
Un voluntario/médico/rescatista se ofrece para una necesidad de recurso humano.
```json
{ "wantsTransport": false }
```
`201` → asignación de auto-despliegue; si `wantsTransport=true`, genera una orden de entrega.

## Catálogos

### GET /api/v1/catalog/roles · GET /api/v1/catalog/resource-types
Devuelven los catálogos configurables (desde KV). Públicos.
