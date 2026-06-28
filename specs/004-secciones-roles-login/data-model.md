# Phase 1 Data Model: Secciones, Roles y Login Único

**Fecha**: 2026-06-28 | **Feature**: 004 | **Almacén**: D1 (+ reutiliza identidad, roles, inventario)

La feature es mayormente de navegación (sin entidades nuevas para secciones/login/roles, que se
apoyan en lo existente). El único añadido persistido es el **centro de acopio**.

## Tabla nueva

### collection_center (centro de acopio)

| Campo | Tipo | Reglas |
|-------|------|--------|
| id | TEXT PK | ULID |
| owner_identity_id | TEXT FK → identity.id | Quién lo registró/gestiona |
| name | TEXT | Nombre del centro (3–80) |
| lat | REAL | Latitud **exacta** (punto público) |
| lng | REAL | Longitud **exacta** |
| region_code | TEXT | Región (estado) para filtros/agregados |
| note | TEXT NULL | Horario/indicaciones (opcional) |
| status | TEXT | `activo` \| `oculto` (por reportes) |
| reports_count | INTEGER | Reportes acumulados (anti-abuso) |
| created_at | INTEGER | epoch ms |

- Índices: (`region_code`, `status`), (`lat`,`lng`) para bounding box.
- A diferencia de `need`, la ubicación es **exacta y pública** (no se ofusca): el centro es un
  punto al que la gente acude.

## Reutilización (sin cambios de esquema)

- **Identidad / sesión**: `identity` (+ `public_name` de feature 3); el login único usa la
  sesión global existente.
- **Roles de voluntario**: `support_person` (feature 2) provee los roles del usuario
  (repartidor/transportista); el selector de rol los consulta. El catálogo `support_roles`
  (KV) los enumera y es extensible.
- **Inventario, necesidades, órdenes, distribución, transparencia**: features 1–3 intactas; se
  reubican en las secciones sin cambios de datos.

## Relaciones

```text
identity 1──N collection_center
identity 1──N support_person (roles de voluntario)   [existente]
```

## Reglas e invariantes

- Crear un centro requiere sesión; **abierto** a cualquiera con **límite de tasa** y **reportes**
  que pueden pasar `status` a `oculto`.
- Donar **no** requiere centro (flujo individual intacto); donar desde un centro toma su
  ubicación como punto de recogida.
- El listado público de centros (mapa) solo muestra `status='activo'`.
- Donar/órdenes/inventario/necesidades no cambian de modelo; la feature 4 es navegación + centros.
