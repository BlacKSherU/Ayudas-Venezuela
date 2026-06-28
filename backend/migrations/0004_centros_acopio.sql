-- Migración 0004 — Centros de acopio (feature 4)
-- Aditiva: no toca features 1-3.

CREATE TABLE IF NOT EXISTS collection_center (
  id                 TEXT PRIMARY KEY,
  owner_identity_id  TEXT NOT NULL REFERENCES identity(id),
  name               TEXT NOT NULL,
  lat                REAL NOT NULL,            -- ubicación EXACTA (punto público)
  lng                REAL NOT NULL,
  region_code        TEXT NOT NULL,
  note               TEXT,
  status             TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'oculto')),
  reports_count      INTEGER NOT NULL DEFAULT 0,
  created_at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_center_region_status ON collection_center (region_code, status);
CREATE INDEX IF NOT EXISTS idx_center_bbox ON collection_center (lat, lng);
CREATE INDEX IF NOT EXISTS idx_center_owner ON collection_center (owner_identity_id);

-- Centro opcional en una orden (punto de recogida = ubicación del centro).
ALTER TABLE delivery_order ADD COLUMN center_id TEXT REFERENCES collection_center(id);
