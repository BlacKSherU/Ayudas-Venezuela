-- Migración inicial — Portal de Coordinación de Ayuda
-- Privacidad por diseño: las coordenadas se almacenan ya ofuscadas a zona (~1 km).
-- Nunca se persiste la dirección exacta del hogar para la vista pública.

-- Identidad ligera: identificador simple para asociar y gestionar publicaciones.
CREATE TABLE IF NOT EXISTS identity (
  id            TEXT PRIMARY KEY,
  channel       TEXT NOT NULL CHECK (channel IN ('email', 'phone')),
  contact_hash  TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  last_seen_at  INTEGER NOT NULL,
  UNIQUE (channel, contact_hash)
);

-- Necesidad: entidad central del mapa.
CREATE TABLE IF NOT EXISTS need (
  id                 TEXT PRIMARY KEY,
  owner_identity_id  TEXT NOT NULL REFERENCES identity(id),
  status             TEXT NOT NULL DEFAULT 'pendiente'
                       CHECK (status IN ('pendiente', 'comprometida', 'entregada', 'expirada')),
  urgency            TEXT NOT NULL CHECK (urgency IN ('alta', 'media', 'baja')),
  zone_lat           REAL NOT NULL,
  zone_lng           REAL NOT NULL,
  region_code        TEXT NOT NULL,
  contact_public     TEXT,
  note               TEXT,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  committed_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_need_region_status ON need (region_code, status);
CREATE INDEX IF NOT EXISTS idx_need_bbox ON need (zone_lat, zone_lng);
CREATE INDEX IF NOT EXISTS idx_need_status_updated ON need (status, updated_at);
CREATE INDEX IF NOT EXISTS idx_need_owner ON need (owner_identity_id);

-- Insumos requeridos por una necesidad (1:N).
CREATE TABLE IF NOT EXISTS need_item (
  id             TEXT PRIMARY KEY,
  need_id        TEXT NOT NULL REFERENCES need(id) ON DELETE CASCADE,
  category_code  TEXT NOT NULL,
  quantity       TEXT
);

CREATE INDEX IF NOT EXISTS idx_need_item_need ON need_item (need_id);
CREATE INDEX IF NOT EXISTS idx_need_item_category ON need_item (category_code);

-- Compromiso de donación (emparejamiento directo).
CREATE TABLE IF NOT EXISTS commitment (
  id                 TEXT PRIMARY KEY,
  need_id            TEXT NOT NULL REFERENCES need(id) ON DELETE CASCADE,
  donor_identity_id  TEXT NOT NULL REFERENCES identity(id),
  status             TEXT NOT NULL DEFAULT 'activo'
                       CHECK (status IN ('activo', 'cumplido', 'liberado', 'cancelado')),
  created_at         INTEGER NOT NULL,
  resolved_at        INTEGER
);

-- A lo sumo un compromiso activo por necesidad (exclusividad, FR-005).
CREATE UNIQUE INDEX IF NOT EXISTS idx_commitment_active_unique
  ON commitment (need_id) WHERE status = 'activo';

-- Registro de auditoría: cambios de estado sin datos personales (FR-014).
CREATE TABLE IF NOT EXISTS audit_event (
  id           TEXT PRIMARY KEY,
  need_id      TEXT NOT NULL,
  action       TEXT NOT NULL,
  from_status  TEXT,
  to_status    TEXT,
  actor_ref    TEXT,
  at           INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_need ON audit_event (need_id);

-- Reportes anti-abuso comunitarios (FR-008).
CREATE TABLE IF NOT EXISTS abuse_report (
  id            TEXT PRIMARY KEY,
  need_id       TEXT NOT NULL REFERENCES need(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL CHECK (reason IN ('duplicado', 'falso', 'spam', 'otro')),
  reporter_ref  TEXT,
  at            INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_abuse_need ON abuse_report (need_id);
