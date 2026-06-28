# Contrato WebSocket — DeliveryRoom (Durable Object)

**Feature**: 002. Un Durable Object **por orden de entrega activa** coordina el estado de la
orden y el **rastreo en vivo** del transportista, difundiendo **solo a las partes** de esa
entrega (donante, necesitado y el propio transportista). Separado del `MapRoom` público para
no filtrar ubicación precisa.

## Conexión

```
WSS /api/v1/orders/{orderId}/track
```
- **Requiere sesión** y ser parte de la orden (donante, necesitado o transportista asignado).
  El Worker valida la pertenencia antes de enrutar al DO; `403` si no es parte.
- El DO se direcciona por `orderId` (`idFromName(orderId)`).

## Mensajes Cliente → Servidor

### position (solo transportista asignado)
Actualización de ubicación precisa mientras la app está abierta (≥ cada 30 s).
```json
{ "type": "position", "lat": 10.5012, "lng": -66.9155, "t": 1750000000000 }
```

### ping
```json
{ "type": "ping", "t": 1750000000000 }
```

## Mensajes Servidor → Cliente

### hello
```json
{ "type": "hello", "orderId": "ulid", "status": "en_camino", "serverTime": 1750000000000 }
```

### order.status
Cambio de estado de la orden (tomada/recogida/en_camino/entregada/con_incidencia).
```json
{ "type": "order.status", "status": "recogida", "at": 1750000000000 }
```

### position.update (solo a donante y necesitado)
Última ubicación del transportista + ETA recalculada.
```json
{ "type": "position.update", "lat": 10.5012, "lng": -66.9155, "etaMinutes": 12, "t": 1750000000000 }
```

### incident
Notifica una incidencia registrada en la orden.
```json
{ "type": "incident", "incidentType": "bloqueo", "at": 1750000000000 }
```

## Reglas de privacidad y ciclo de vida

- La `position` precisa del transportista se difunde **solo** a donante y necesitado de esa
  orden; nunca al público ni a otras órdenes.
- La ubicación en vivo **no se persiste** a largo plazo: el DO guarda solo la última conocida
  mientras la orden está activa; se descarta al entregar/cancelar o al cerrar la app
  (sin actualizaciones, deja de difundirse).
- Al pasar la orden a `entregada`/`cancelada`, el DO cierra las conexiones y limpia su estado.
- ETA = distancia(haversine última posición → destino) / velocidad media (KV); se recalcula en
  cada `position`.

## Reconexión / degradación

- Cliente reintenta con backoff (1s,2s,5s,…máx 30s) y reconsulta `GET /orders/{id}` al volver.
- Si el transportista pierde señal o cierra la app, deja de emitir `position`; las partes ven
  la última posición conocida y un estado "sin señal" tras un tiempo, sin bloquear el flujo.
- Sin WebSocket, el panel cae a polling de `GET /orders/{id}` (estado + última ETA).
