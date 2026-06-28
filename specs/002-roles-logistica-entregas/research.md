# Phase 0 Research: Roles, Dashboards y Logística de Entregas

**Fecha**: 2026-06-27 | **Feature**: 002-roles-logistica-entregas

Resuelve las decisiones técnicas de la feature 2 sobre el stack existente de Cloudflare.

## D1. Almacenamiento de medios (fotos/videos, cédula) → R2

- **Decision**: Usar **Cloudflare R2** con buckets privados. Las subidas pasan por el Worker
  (proxy autenticado) que valida tipo y tamaño (foto ≤5 MB, video ≤15 s/≤25 MB) y escribe el
  objeto en R2. La descarga se sirve solo vía Worker tras verificar que quien pide es parte de
  esa orden/incidencia. La foto de **cédula** se cifra en aplicación (AES-GCM) **antes** de
  subirse a R2.
- **Rationale**: R2 es el almacenamiento de objetos nativo de Cloudflare (sin costo de
  egreso), idóneo para binarios. El proxy por Worker permite aplicar control de acceso y
  límites sin exponer el bucket. Cifrar la cédula antes de subir cumple FR-003/FR-027.
- **Alternatives considered**:
  - Subida directa con URL prefirmada (S3/aws4fetch): menos carga en el Worker, pero
    complica el control de acceso por-objeto y la validación de tamaño/tipo; se difiere.
  - Guardar binarios en D1: inviable por tamaño; D1 es relacional, no para blobs.
- **Notas**: Nombrar objetos con claves opacas (UUID); metadatos mínimos. Retención de
  evidencias 90 días mediante barrido programado (Cron) que borra objetos vencidos.

## D2. Cifrado de datos sensibles (cédula y ubicación exacta)

- **Decision**: Cifrado de aplicación con **AES-GCM** (WebCrypto) usando una clave maestra en
  *secret* (`ENCRYPTION_KEY`). Se cifran: el número y la foto de cédula, y las coordenadas
  exactas (lat/lng) de necesidades y puntos de recogida/entrega. Se almacena el ciphertext +
  IV en D1 (coordenadas) o R2 (foto). El descifrado ocurre solo en el Worker para destinatarios
  autorizados (transportista asignado; auditoría ante disputa).
- **Rationale**: Cumple "siempre guardar la ubicación exacta" (decisión del usuario) y FR-026
  sin exponerla: el público sigue viendo solo la zona ofuscada (feature 1). El cifrado a nivel
  de aplicación garantiza que ni un volcado de la base ni la API pública revelen el dato.
- **Alternatives considered**:
  - Confiar solo en control de acceso (sin cifrar): más simple, pero un acceso indebido al
    almacén expondría datos sensibles; no cumple el espíritu del Principio I.
  - KMS externo: añade dependencia fuera de Cloudflare; el secret + WebCrypto basta.
- **Notas**: Rotación de clave futura mediante versión de clave en el registro. La ubicación
  exacta NUNCA se incluye en respuestas públicas ni en el snapshot del mapa.

## D3. Órdenes de entrega: ciclo de vida y exclusividad

- **Decision**: Tabla D1 `delivery_order` con estados `disponible → tomada →
  recogida → en_camino → entregada`, más `con_incidencia`, `liberada`, `cancelada`. El
  **claim exclusivo** (un transportista por orden) se garantiza con un índice único parcial
  (como en `commitment` de feature 1) y verificación transaccional. La confirmación de
  recogida y de entrega usa **códigos de un solo uso** (hash en la orden; el transportista los
  introduce). Auto-liberación por inactividad (alarma de DO/cron).
- **Rationale**: Reaprovecha el patrón probado de exclusividad y auto-liberación de feature 1.
  Los códigos evitan entregas falsas (FR-011) sin operador central.
- **Alternatives considered**: Solo confirmación mutua en app (sin códigos): más simple pero
  más fácil de falsear; los códigos añaden prueba de presencia física.

## D4. Tiempo real de la entrega y rastreo en vivo → DeliveryRoom (Durable Object)

- **Decision**: Un **Durable Object `DeliveryRoom` por orden activa**. Mantiene las conexiones
  WebSocket de las partes (donante, necesitado) y del transportista. El transportista envía su
  **ubicación precisa** periódicamente (≥ cada 30 s) mientras la app está abierta; el DO la
  retransmite solo a las partes y actualiza la ETA. También difunde los cambios de estado de la
  orden. La ubicación en vivo no se persiste a largo plazo (solo última conocida en el DO).
- **Rationale**: Aísla cada entrega (privacidad: solo las partes), escala por orden, y usa
  WebSocket Hibernation para bajo costo. Separar del `MapRoom` evita mezclar el mapa público
  con datos precisos privados.
- **Alternatives considered**: Reusar `MapRoom`: arriesga filtrar ubicación precisa al público;
  rechazado por privacidad. Polling de ubicación: peor latencia y batería.

## D5. Dashboards (donante y necesitado), distancia y "más solicitados"

- **Decision**: Endpoints de agregación en el Worker. Donante: lista de necesidades con
  **distancia haversine** desde su ubicación aproximada (calculada en el servidor o cliente) y
  ranking de recursos por conteo (`GROUP BY category_code`). Necesitado: sus necesidades +
  órdenes asociadas con estado y ETA. La distancia usa la zona aproximada (no expone exacta).
- **Rationale**: Consultas D1 simples e indexadas; haversine es barato. Mantiene privacidad
  (distancia sobre zona, no sobre dirección exacta).
- **Alternatives considered**: Motor de búsqueda/geo dedicado: innecesario al volumen previsto.

## D6. ETA (tiempo estimado de llegada)

- **Decision**: ETA = distancia haversine entre la ubicación en vivo del transportista (o el
  punto de recogida si aún no recoge) y el destino, dividida por una **velocidad media
  configurable** (KV, p. ej. 25 km/h urbano), con un mínimo. Se recalcula con cada actualización
  de posición.
- **Rationale**: Simple, sin dependencia de un servicio de rutas externo (costo/privacidad).
  Suficiente para dar previsibilidad; refinable luego con enrutamiento real.
- **Alternatives considered**: API de rutas (Google/OSRM): mejor precisión, pero costo y
  dependencia externa que choca con "gratuito/Cloudflare-only"; se difiere.

## D7. Catálogos configurables (roles y tipos de recurso) — agnosticismo

- **Decision**: Catálogos en **KV**: `support_roles` (repartidor, transportista, …) y
  `resource_types` (con bandera `kind: "fisico" | "humano"` y `transportable`). El código lee
  los catálogos; añadir un rol o tipo es un cambio de datos, no de código (FR-005/FR-023/SC-009).
- **Rationale**: Cumple el requisito de extensibilidad sin redeploy.
- **Alternatives considered**: Enumeraciones en código: rápidas pero violan el agnosticismo
  pedido. Tabla D1 de catálogo: válida; KV se elige por simplicidad y lectura en el borde.

## D8. Recursos humanos: flujo híbrido

- **Decision**: Un tipo de recurso `kind: "humano"` (médico, rescatista, voluntario). Por
  defecto, **auto-despliegue**: la persona se ofrece (crea una asignación de auto-despliegue) y
  va directamente; el sistema conecta, comparte zona y muestra estado/ETA. La persona MAY
  solicitar transporte, generando entonces una orden de entrega normal.
- **Rationale**: Refleja la realidad (un médico va él mismo) y cumple la decisión "híbrido".
- **Alternatives considered**: Forzar todo por órdenes de transporte: poco natural; rechazado.

## D9. Reputación y suspensión automática

- **Decision**: Tras cada entrega, donante y necesitado pueden valorar (1–5). La reputación es
  el promedio ponderado + conteo de entregas; un transportista cae en `suspendido`
  automáticamente si su promedio baja de un umbral (KV) con un mínimo de valoraciones, o si
  acumula reportes. Suspendido = no puede tomar órdenes.
- **Rationale**: Anti-abuso sin operador central (Principio IV), coherente con auto-aprobación.
- **Alternatives considered**: Solo conteo de entregas: menos señal de calidad; rechazado por
  el usuario en clarify.

## D10. Migración de la feature 1: ubicación exacta

- **Decision**: La migración `0002` añade a `need` columnas para la **ubicación exacta cifrada**
  (`exact_enc`, `exact_iv`) además de la zona ofuscada ya existente. El endpoint de creación de
  necesidades (feature 1) ya recibe el punto exacto del cliente; se actualiza para **cifrar y
  guardar** ese punto, manteniendo pública solo la zona. Necesidades antiguas quedan sin exacta
  (nulo) hasta que se editen.
- **Rationale**: Habilita la entrega a domicilio sin exponer la dirección (FR-026), con cambio
  mínimo (el dato ya viaja desde el cliente).
- **Alternatives considered**: Pedir la dirección exacta recién al asignar el transportista:
  añade fricción en el momento crítico; el usuario pidió "guardar siempre la exacta".

## Resumen de decisiones

| # | Tema | Decisión |
|---|------|----------|
| D1 | Medios | R2 privado vía Worker; límites foto/video; retención 90 d |
| D2 | Cifrado | AES-GCM (WebCrypto) para cédula y ubicación exacta; clave en secret |
| D3 | Órdenes | Estados + claim exclusivo + códigos de un solo uso + auto-liberar |
| D4 | Realtime entrega | Durable Object `DeliveryRoom` por orden; rastreo preciso solo a partes |
| D5 | Dashboards | Agregados D1; distancia haversine sobre zona; ranking por categoría |
| D6 | ETA | Haversine / velocidad media configurable (KV) |
| D7 | Catálogos | Roles y tipos de recurso en KV (extensible sin redeploy) |
| D8 | Recursos humanos | Híbrido: auto-despliegue por defecto, transporte opcional |
| D9 | Reputación | Valoración mutua 1–5 + suspensión automática por umbral |
| D10 | Migración f1 | Añadir ubicación exacta cifrada a `need`; cifrar al crear |

**Estado**: Incógnitas resueltas. Listo para Fase 1 (diseño y contratos).
