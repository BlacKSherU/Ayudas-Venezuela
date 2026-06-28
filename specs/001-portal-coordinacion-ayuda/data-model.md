# Phase 1 Data Model: Portal de Coordinación de Ayuda

**Fecha**: 2026-06-27 | **Feature**: 001-portal-coordinacion-ayuda | **Almacén**: Cloudflare D1 (SQLite)

Convenciones: identificadores `TEXT` (UUID/ULID); marcas temporales en epoch ms (`INTEGER`).
Las coordenadas públicas se almacenan ya **ofuscadas** a la rejilla de zona (~1 km). Nunca se
persiste la dirección exacta del hogar para la vista pública (Principio I).

## Entidades

### 1. identity (Identidad ligera)

Identificador simple de quien publica/gestiona necesidades. Opcional para ver el mapa.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| channel | TEXT | `email` (MVP) \| `phone` (futuro) |
| contact_hash | TEXT | Hash del correo/teléfono (no se guarda en claro) |
| created_at | INTEGER | epoch ms |
| last_seen_at | INTEGER | epoch ms |

- Único: (`channel`, `contact_hash`).
- El valor de contacto en claro NO se almacena; solo su hash para reconocer al titular.

### 2. need (Necesidad)

Requerimiento de insumos publicado por una persona afectada. Entidad central del mapa.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| owner_identity_id | TEXT FK → identity.id | Autor; autoriza la gestión |
| status | TEXT | `pendiente` \| `comprometida` \| `entregada` \| `expirada` |
| urgency | TEXT | `alta` \| `media` \| `baja` |
| zone_lat | REAL | Latitud ofuscada (rejilla ~1 km) |
| zone_lng | REAL | Longitud ofuscada (rejilla ~1 km) |
| region_code | TEXT | Estado/región de Venezuela (sharding de realtime) |
| contact_public | TEXT NULL | Contacto público opcional (opt-in, FR-016); NULL si no se subió |
| note | TEXT NULL | Descripción breve (≤280 chars) |
| created_at | INTEGER | epoch ms |
| updated_at | INTEGER | epoch ms; base para expiración a 30 días |
| committed_at | INTEGER NULL | Inicio del compromiso; base para auto-liberar a 12 h |

- Índices: (`region_code`, `status`), (`zone_lat`, `zone_lng`) para bounding box,
  (`status`, `updated_at`) para barrido de expiración.
- `note` y `contact_public` se moderan por anti-abuso; `contact_public` solo se muestra tras
  el aviso de visibilidad pública.

### 3. need_item (Insumo de una necesidad)

Una necesidad puede requerir varios tipos de insumo. Relación 1:N con `need`.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | ON DELETE CASCADE |
| category_code | TEXT | FK lógica → catálogo (KV): `agua`, `alimentos`, `medicinas`, `higiene`, `abrigo`, … |
| quantity | TEXT NULL | Cantidad/medida libre (p. ej. "20 litros") |

- Índice: (`need_id`), (`category_code`) para filtrar por tipo de insumo.

### 4. commitment (Compromiso de donación / emparejamiento)

Relación entre una necesidad y la persona donante que se compromete a atenderla.

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | Único activo por necesidad |
| donor_identity_id | TEXT FK → identity.id | Donante comprometido |
| status | TEXT | `activo` \| `cumplido` \| `liberado` (timeout) \| `cancelado` |
| created_at | INTEGER | epoch ms |
| resolved_at | INTEGER NULL | epoch ms al cumplir/liberar/cancelar |

- Regla de exclusividad: a lo sumo un `commitment` con `status='activo'` por `need_id`
  (FR-005). Se garantiza con verificación transaccional en el DO/Worker.
- Auto-liberar: si `now - need.committed_at ≥ 12 h` sin cumplimiento → `liberado` y la
  necesidad vuelve a `pendiente` (FR-007).

### 5. audit_event (Registro de auditoría)

Cambios de estado auditables, sin datos personales (Principio IV / FR-014).

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | |
| action | TEXT | `created` \| `committed` \| `released` \| `delivered` \| `expired` \| `edited` \| `reported` |
| from_status | TEXT NULL | |
| to_status | TEXT NULL | |
| actor_ref | TEXT NULL | Referencia no identificable (p. ej. hash de identidad) |
| at | INTEGER | epoch ms |

- Inmutable (solo inserción). No contiene contacto ni ubicación exacta.

### 6. abuse_report (Reporte anti-abuso)

Reportes comunitarios para preservar la veracidad (FR-008/FR-017).

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| need_id | TEXT FK → need.id | |
| reason | TEXT | `duplicado` \| `falso` \| `spam` \| `otro` |
| reporter_ref | TEXT NULL | Hash de IP/identidad para limitar duplicados |
| at | INTEGER | epoch ms |

- Al superar un umbral configurable (KV), la necesidad se oculta de las vistas públicas y
  queda marcada para revisión.

## Catálogo de insumos (KV, no en D1)

`categories` (KV): lista administrable de `{ code, label_es, icon }`. Permite ampliar tipos
de insumo sin migración de esquema. Ejemplos: `agua`, `alimentos`, `medicinas`, `higiene`,
`abrigo`, `bebes` (pañales/fórmula).

## Máquina de estados de `need`

```text
            commit (exclusivo)            confirmar entrega
pendiente ───────────────────▶ comprometida ───────────────────▶ entregada (final)
    ▲                              │
    │   timeout 12h / cancelar     │
    └──────────────────────────────┘

pendiente ──(30 días sin actualización)──▶ expirada (final)
```

Reglas de transición:
- `pendiente → comprometida`: solo si no hay compromiso activo (FR-005); fija `committed_at`.
- `comprometida → pendiente`: por timeout de 12 h (FR-007) o cancelación del donante.
- `comprometida → entregada`: la confirma el donante comprometido o el dueño (FR-006/FR-018).
- `pendiente → expirada`: 30 días sin actualización (FR-019).
- Toda transición genera un `audit_event` y un evento de difusión por WebSocket.

## Vistas públicas vs. privadas (privacidad por diseño)

- **Pública** (sin login): `need` con `zone_lat/lng` ofuscadas, `status`, `urgency`,
  `region_code`, `need_item[]`, `note`, y `contact_public` solo si la persona lo subió.
  Nunca expone `owner_identity_id`, hashes, ni ubicación exacta.
- **Privada** (titular autenticado): gestión de sus propias necesidades (editar, comprometer,
  cerrar, eliminar) y sus datos de contacto.

## Relaciones (resumen)

```text
identity 1──N need 1──N need_item
identity 1──N commitment N──1 need
need 1──N audit_event
need 1──N abuse_report
```

**Validaciones clave**: zona dentro de Venezuela; `urgency`/`status`/`category_code` en
enumeraciones válidas; `note` ≤280; un solo compromiso activo por necesidad; `contact_public`
solo presente con consentimiento explícito registrado.
