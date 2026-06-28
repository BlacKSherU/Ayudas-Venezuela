-- Migración 0002 — Roles y logística de entregas (feature 2)
-- Datos sensibles (cédula, ubicación exacta) se guardan cifrados (AES-GCM): ciphertext + iv.

-- Ubicación exacta cifrada de la necesidad (FR-026). La zona ofuscada pública se conserva.
ALTER TABLE need ADD COLUMN exact_enc TEXT;
ALTER TABLE need ADD COLUMN exact_iv TEXT;
ALTER TABLE need ADD COLUMN key_version INTEGER;

-- Personal de apoyo (repartidores/transportistas).
CREATE TABLE IF NOT EXISTS support_person (
  id                TEXT PRIMARY KEY,
  identity_id       TEXT NOT NULL REFERENCES identity(id),
  role_code         TEXT NOT NULL,
  cedula_enc        TEXT NOT NULL,
  cedula_iv         TEXT NOT NULL,
  cedula_photo_key  TEXT,
  key_version       INTEGER NOT NULL DEFAULT 1,
  status            TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'suspendido')),
  rating_avg        REAL NOT NULL DEFAULT 0,
  rating_count      INTEGER NOT NULL DEFAULT 0,
  deliveries_done   INTEGER NOT NULL DEFAULT 0,
  reports_count     INTEGER NOT NULL DEFAULT 0,
  created_at        INTEGER NOT NULL,
  UNIQUE (identity_id, role_code)
);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_person (status);

-- Órdenes de entrega.
CREATE TABLE IF NOT EXISTS delivery_order (
  id                 TEXT PRIMARY KEY,
  need_id            TEXT NOT NULL REFERENCES need(id),
  donor_identity_id  TEXT NOT NULL REFERENCES identity(id),
  support_person_id  TEXT REFERENCES support_person(id),
  status             TEXT NOT NULL DEFAULT 'disponible'
                       CHECK (status IN ('disponible','tomada','recogida','en_camino',
                                         'entregada','con_incidencia','liberada','cancelada')),
  pickup_zone_lat    REAL NOT NULL,
  pickup_zone_lng    REAL NOT NULL,
  pickup_exact_enc   TEXT,
  pickup_exact_iv    TEXT,
  dropoff_exact_enc  TEXT,
  dropoff_exact_iv   TEXT,
  region_code        TEXT NOT NULL,
  pickup_code_hash   TEXT NOT NULL,
  dropoff_code_hash  TEXT NOT NULL,
  proof_media_key    TEXT,
  eta_ms             INTEGER,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  taken_at           INTEGER,
  delivered_at       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_order_region_status ON delivery_order (region_code, status);
CREATE INDEX IF NOT EXISTS idx_order_status_updated ON delivery_order (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_order_support ON delivery_order (support_person_id);
-- A lo sumo una orden activa (con transportista) por necesidad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_active_need
  ON delivery_order (need_id)
  WHERE status IN ('tomada','recogida','en_camino');

CREATE TABLE IF NOT EXISTS order_item (
  id             TEXT PRIMARY KEY,
  order_id       TEXT NOT NULL REFERENCES delivery_order(id) ON DELETE CASCADE,
  category_code  TEXT NOT NULL,
  quantity       TEXT
);
CREATE INDEX IF NOT EXISTS idx_order_item_order ON order_item (order_id);

CREATE TABLE IF NOT EXISTS incident (
  id                   TEXT PRIMARY KEY,
  order_id             TEXT NOT NULL REFERENCES delivery_order(id) ON DELETE CASCADE,
  reporter_support_id  TEXT NOT NULL REFERENCES support_person(id),
  type                 TEXT NOT NULL,
  description          TEXT,
  media_key            TEXT,
  at                   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_incident_order ON incident (order_id);

CREATE TABLE IF NOT EXISTS media_object (
  key           TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('cedula','evidencia','prueba_entrega')),
  content_type  TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  owner_ref     TEXT,
  encrypted     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_created ON media_object (created_at);

CREATE TABLE IF NOT EXISTS rating (
  id                 TEXT PRIMARY KEY,
  order_id           TEXT NOT NULL REFERENCES delivery_order(id) ON DELETE CASCADE,
  support_person_id  TEXT NOT NULL REFERENCES support_person(id),
  rater_identity_id  TEXT NOT NULL REFERENCES identity(id),
  score              INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment            TEXT,
  at                 INTEGER NOT NULL,
  UNIQUE (order_id, rater_identity_id)
);

CREATE TABLE IF NOT EXISTS self_deploy_assignment (
  id                    TEXT PRIMARY KEY,
  need_id               TEXT NOT NULL REFERENCES need(id),
  volunteer_identity_id TEXT NOT NULL REFERENCES identity(id),
  status                TEXT NOT NULL DEFAULT 'ofrecido'
                          CHECK (status IN ('ofrecido','en_camino','presente','cancelado')),
  wants_transport       INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_selfdeploy_need ON self_deploy_assignment (need_id);
