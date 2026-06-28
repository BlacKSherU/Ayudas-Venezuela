# Contrato WebSocket de Tiempo Real — Durable Object "MapRoom"

**Feature**: 001-portal-coordinacion-ayuda

El tiempo real es la pieza esencial: el mapa de cada persona se actualiza en vivo (≤5 s,
SC-003) cuando aparecen o cambian necesidades. Se implementa con Durable Objects usando la
**WebSocket Hibernation API**, con **un DO por región** (`region_code`) de Venezuela.

## Conexión

```
WSS /api/v1/realtime?region=<REGION_CODE>
```
- El cliente abre una conexión por región visible en su viewport (normalmente 1; varias al
  cruzar fronteras de región).
- No requiere sesión: observar el mapa es público (FR-009).
- El Worker enruta la conexión al DO correspondiente a `region`.

## Mensajes Cliente → Servidor

### subscribe
Ajusta el filtro de viewport para recibir solo lo relevante.
```json
{ "type": "subscribe", "bbox": [minLng, minLat, maxLng, maxLat],
  "filters": { "status": "pendiente", "category": null, "urgency": null } }
```

### ping
Keep-alive opcional (también se usa el ping nativo del protocolo).
```json
{ "type": "ping", "t": 1750000000000 }
```

## Mensajes Servidor → Cliente

### hello
Confirma suscripción y entrega metadatos.
```json
{ "type": "hello", "region": "DC", "serverTime": 1750000000000 }
```

### need.created
```json
{ "type": "need.created", "need": { "id": "ulid", "status": "pendiente",
  "urgency": "alta", "zone": { "lat": 10.49, "lng": -66.90 },
  "items": [{ "categoryCode": "agua" }], "updatedAt": 1750000000000 } }
```

### need.updated
Cambios de estado/contenido (incluye `comprometida`, reabierta, editada).
```json
{ "type": "need.updated", "need": { "id": "ulid", "status": "comprometida",
  "updatedAt": 1750000000050 } }
```

### need.closed
Necesidad retirada de las vistas activas (`entregada`, `expirada` u oculta por reportes).
```json
{ "type": "need.closed", "id": "ulid", "reason": "entregada" }
```

### pong
```json
{ "type": "pong", "t": 1750000000000 }
```

## Reglas de difusión

- El Worker, tras confirmar una escritura en D1, invoca al DO de la `region_code` afectada,
  que retransmite el evento a las conexiones cuya `bbox`/filtros coincidan.
- Filtrado por viewport: el DO solo envía a clientes cuyo `bbox` contiene la zona del evento
  y cuyos filtros (status/category/urgency) coinciden, para minimizar tráfico en 3G.
- Entrega "al menos una vez" sin garantía de orden estricto; el cliente reconcilia por
  `updatedAt` (más reciente gana) e ignora duplicados por `id`.

## Reconexión y degradación

- El cliente reintenta con backoff exponencial (p. ej. 1s, 2s, 5s, 15s, máx 30s).
- Al reconectar: vuelve a `subscribe` y refresca el snapshot vía `GET /api/v1/needs?bbox=…`
  para no perder eventos ocurridos mientras estuvo desconectado.
- Si el WebSocket no está disponible, la app degrada a **polling** del snapshot REST cada
  ~15 s, manteniendo el mapa/lista utilizables (FR-012, degradación elegante).

## Escala

- Sharding por región distribuye las conexiones entre múltiples DO, habilitando ≥10.000
  concurrentes (SC-007).
- La Hibernation API mantiene conexiones inactivas sin costo de cómputo continuo.
- Alarmas de DO ejecutan barridos por región: auto-liberar compromisos a las 12 h (FR-007) y
  expirar necesidades a los 30 días (FR-019), emitiendo los `need.updated`/`need.closed`
  correspondientes.
