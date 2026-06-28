# Phase 1 Data Model: Roles, Dashboards y Logística de Entregas

**Fecha**: 2026-06-27 | **Feature**: 002 | **Almacén**: D1 (relacional) + R2 (binarios) + KV (catálogos)

Extiende el modelo de la feature 1. Datos sensibles (cédula, ubicación exacta) se guardan
**cifrados** (AES-GCM): se persiste `ciphertext` + `iv`. Las vistas públicas nunca los exponen.

## Cambios a entidades existentes (feature 1)

### need (ampliada) — migración 0002

Se añaden columnas para la **ubicación exacta cifrada** (FR-026). La zona ofuscada pública
(`zone_lat/lng`) se mantiene igual.

| Campo nuevo | Tipo | Reglas |
|-------------|------|--------|
| exact_enc | TEXT NULL | Coordenada exacta (lat,lng) cifrada AES-GCM (base64) |
| exact_iv | TEXT NULL | IV del cifrado |
| key_version | INTEGER NULL | Versión de la clave de cifrado usada |

- La exacta solo se descifra para el transportista asignado a una orden de esa necesidad, o
  para auditoría ante disputa. Nunca se incluye en respuestas públicas.

## Entidades nuevas

### support_person (Personal de apoyo)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| identity_id | TEXT FK → identity.id | Identidad ligera (feature 1) |
| role_code | TEXT | FK lógica → catálogo KV `support_roles` (repartidor/transportista/…) |
| cedula_enc | TEXT | Número de cédula cifrado (AES-GCM) |
| cedula_iv | TEXT | IV |
| cedula_photo_key | TEXT | Clave del objeto R2 con la foto de cédula (contenido cifrado) |
| key_version | INTEGER | Versión de clave |
| status | TEXT | `activo` \| `suspendido` |
| rating_avg | REAL | Promedio de valoraciones (0 si sin datos) |
| rating_count | INTEGER | Nº de valoraciones |
| deliveries_done | INTEGER | Entregas completadas |
| reports_count | INTEGER | Reportes acumulados |
| created_at | INTEGER | epoch ms |

- Único: (`identity_id`, `role_code`). Índice por `status`.
- Cédula y foto nunca se devuelven en API pública (FR-003).

### delivery_order (Orden de entrega)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | Necesidad destino |
| donor_identity_id | TEXT FK → identity.id | Donante origen |
| support_person_id | TEXT FK → support_person.id NULL | Transportista asignado (cuando se toma) |
| status | TEXT | `disponible`\|`tomada`\|`recogida`\|`en_camino`\|`entregada`\|`con_incidencia`\|`liberada`\|`cancelada` |
| pickup_zone_lat / pickup_zone_lng | REAL | Zona aproximada de recogida (pública) |
| pickup_exact_enc / pickup_exact_iv | TEXT NULL | Dirección exacta de recogida cifrada (solo al asignado) |
| dropoff_exact_enc / dropoff_exact_iv | TEXT NULL | Dirección exacta de entrega cifrada (solo al asignado) |
| region_code | TEXT | Región (sharding/listado) |
| pickup_code_hash | TEXT | Hash del código de recogida (un solo uso) |
| dropoff_code_hash | TEXT | Hash del código de entrega (un solo uso) |
| proof_media_key | TEXT NULL | Objeto R2 con foto de prueba de entrega (opcional) |
| eta_ms | INTEGER NULL | Tiempo estimado de llegada (recalculado) |
| created_at / updated_at | INTEGER | epoch ms |
| taken_at / delivered_at | INTEGER NULL | epoch ms |

- Índice único parcial: a lo sumo una orden activa con `support_person_id` por necesidad
  (exclusividad, FR-008). Índices: (`region_code`,`status`), (`status`,`updated_at`).
- Lista de recursos por orden vía `order_item` (espejo de `need_item`).

### order_item (Recurso de una orden)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| order_id | TEXT FK → delivery_order.id ON DELETE CASCADE | |
| category_code | TEXT | FK lógica → catálogo KV `resource_types` |
| quantity | TEXT NULL | |

### incident (Incidencia en ruta)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| order_id | TEXT FK → delivery_order.id | |
| reporter_support_id | TEXT FK → support_person.id | Autor |
| type | TEXT | `bloqueo`\|`robo`\|`dano`\|`retraso`\|`otro` (catálogo extensible) |
| description | TEXT NULL | ≤500 |
| media_key | TEXT NULL | Objeto R2 con foto/video de evidencia |
| at | INTEGER | epoch ms |

- Para tipos que requieren evidencia (robo/daño), `media_key` es obligatorio (FR-019).

### media_object (Referencia a medio en R2)

| Campo | Tipo | Reglas |
|-------|------|--------|
| key | TEXT PK | Clave del objeto en R2 (UUID opaco) |
| kind | TEXT | `cedula`\|`evidencia`\|`prueba_entrega` |
| content_type | TEXT | image/* o video/* |
| size_bytes | INTEGER | Validado por límites (foto ≤5 MB, video ≤25 MB) |
| owner_ref | TEXT | Referencia lógica (order_id/incident_id/support_id) |
| encrypted | INTEGER | 1 si el contenido está cifrado (cédula) |
| created_at | INTEGER | epoch ms; base para retención (90 d evidencias) |

### rating (Valoración)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| order_id | TEXT FK → delivery_order.id | Única por (order, rater) |
| support_person_id | TEXT FK → support_person.id | Calificado |
| rater_identity_id | TEXT FK → identity.id | Donante o necesitado |
| score | INTEGER | 1–5 |
| comment | TEXT NULL | ≤280 |
| at | INTEGER | epoch ms |

- Único: (`order_id`, `rater_identity_id`). Actualiza `rating_avg/rating_count` del apoyo.

### self_deploy_assignment (Auto-despliegue de recurso humano)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | Necesidad de recurso humano |
| volunteer_identity_id | TEXT FK → identity.id | Persona que se ofrece |
| status | TEXT | `ofrecido`\|`en_camino`\|`presente`\|`cancelado` |
| wants_transport | INTEGER | 1 si solicita transporte (genera delivery_order) |
| created_at / updated_at | INTEGER | epoch ms |

## Catálogos (KV, configurables — agnosticismo)

- `support_roles`: `[{ code, labelEs, requiresCedula: true }]` (repartidor, transportista, …).
- `resource_types`: `[{ code, labelEs, icon, kind: "fisico"|"humano", transportable }]`
  (insumos médicos, comida, ropa, herramientas, médico, rescatista, voluntario, …).
- `params`: umbral de reputación, mínimo de valoraciones, límites de medios, velocidad media
  para ETA, ventana de auto-liberación.

## Máquina de estados de `delivery_order`

```text
disponible ─tomar→ tomada ─código recogida→ recogida ─en marcha→ en_camino ─código entrega→ entregada (final)
     ▲                │                                   │
     │  auto-liberar  │            incidencia             ▼
     └────────────────┴───────────────────────────→ con_incidencia ──(reasignar)→ disponible
```

- `entregada` ⇒ la `need` asociada se marca atendida (feature 1) y se difunde a las partes.
- Robo/daño total ⇒ la `need` puede **reabrirse** (FR-013).
- Toda transición genera auditoría y difusión por la `DeliveryRoom`.

## Privacidad (resumen)

| Dato | Público | Quién lo ve |
|------|---------|-------------|
| Zona aproximada (need/recogida) | Sí (mapa) | Todos |
| Ubicación exacta (need/recogida/entrega) | No (cifrada) | Solo transportista asignado; auditoría ante disputa |
| Cédula nº/foto | No (cifrada) | Nadie rutinariamente; auditoría ante disputa (FR-003) |
| Rastreo en vivo (preciso) | No | Solo donante y necesitado de esa entrega |
| Evidencia de incidencia | No | Partes de esa entrega |
| Reputación (promedio, nº entregas) | Sí (agregado, no identifica) | Todos |

## Relaciones (resumen)

```text
identity 1──N support_person 1──N rating
support_person 1──N delivery_order (asignadas)
need 1──N delivery_order 1──N order_item
delivery_order 1──N incident
delivery_order 1──1 proof_media (media_object)
need 1──N self_deploy_assignment
```
