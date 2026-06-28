-- Migración 0003 — Catálogo de productos, inventario público y normalización (feature 3)
-- Aditiva y con backfill: preserva los datos de features 1 y 2.

-- Categorías como datos de referencia con integridad (antes: códigos sueltos en KV/texto).
CREATE TABLE IF NOT EXISTS category (
  code      TEXT PRIMARY KEY,
  label_es  TEXT NOT NULL,
  kind      TEXT NOT NULL DEFAULT 'fisico' CHECK (kind IN ('fisico', 'humano'))
);

-- Catálogo común de productos, deduplicado por nombre normalizado.
CREATE TABLE IF NOT EXISTS product (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  normalized_name  TEXT NOT NULL,
  category_code    TEXT NOT NULL REFERENCES category(code),
  dimension        TEXT NOT NULL CHECK (dimension IN ('masa', 'volumen', 'conteo')),
  base_unit        TEXT NOT NULL,
  created_by       TEXT REFERENCES identity(id),
  created_at       INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_normalized ON product (normalized_name);
CREATE INDEX IF NOT EXISTS idx_product_category ON product (category_code);

-- Inventario por usuario: kind 'personal' (lo que tiene) o 'transito' (transportista en ruta).
CREATE TABLE IF NOT EXISTS inventory (
  id                 TEXT PRIMARY KEY,
  owner_identity_id  TEXT NOT NULL REFERENCES identity(id),
  kind               TEXT NOT NULL DEFAULT 'personal' CHECK (kind IN ('personal', 'transito')),
  created_at         INTEGER NOT NULL,
  UNIQUE (owner_identity_id, kind)
);

-- Saldo proyectado (mantenido transaccionalmente junto al libro). Unidad base del producto.
CREATE TABLE IF NOT EXISTS product_balance (
  inventory_id  TEXT NOT NULL REFERENCES inventory(id),
  product_id    TEXT NOT NULL REFERENCES product(id),
  qty_base      REAL NOT NULL DEFAULT 0,
  updated_at    INTEGER NOT NULL,
  PRIMARY KEY (inventory_id, product_id)
);

-- Libro mayor de movimientos: APPEND-ONLY e inmutable. Fuente de verdad pública.
CREATE TABLE IF NOT EXISTS inventory_movement (
  id                         TEXT PRIMARY KEY,
  inventory_id               TEXT NOT NULL REFERENCES inventory(id),
  product_id                 TEXT NOT NULL REFERENCES product(id),
  type                       TEXT NOT NULL CHECK (type IN (
                               'alta','salida_recogida','entrada_recogida',
                               'salida_entrega','entrada_entrega',
                               'entrega_directa_salida','entrada_directa','baja')),
  direction                  TEXT NOT NULL CHECK (direction IN ('in','out')),
  qty_base                   REAL NOT NULL,
  declared_unit              TEXT NOT NULL,
  declared_qty               REAL NOT NULL,
  reason                     TEXT,
  counterparty_inventory_id  TEXT REFERENCES inventory(id),
  order_id                   TEXT,
  at                         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_movement_inventory ON inventory_movement (inventory_id, at);
CREATE INDEX IF NOT EXISTS idx_movement_product ON inventory_movement (product_id);
CREATE INDEX IF NOT EXISTS idx_movement_order ON inventory_movement (order_id);

-- Normalización: referencias a producto en necesidades y órdenes (integridad).
ALTER TABLE need_item ADD COLUMN product_id TEXT REFERENCES product(id);
ALTER TABLE order_item ADD COLUMN product_id TEXT REFERENCES product(id);

-- Nombre público elegido por el usuario (o alias no personal por defecto).
ALTER TABLE identity ADD COLUMN public_name TEXT;

-- Seed de categorías desde los códigos en uso (consolida lo que estaba en configuración).
INSERT OR IGNORE INTO category (code, label_es, kind) VALUES
  ('agua', 'Agua', 'fisico'),
  ('alimentos', 'Alimentos', 'fisico'),
  ('medicinas', 'Medicinas', 'fisico'),
  ('higiene', 'Higiene', 'fisico'),
  ('abrigo', 'Abrigo y refugio', 'fisico'),
  ('bebes', 'Bebés (pañales/fórmula)', 'fisico'),
  ('herramientas', 'Herramientas', 'fisico'),
  ('medico', 'Personal médico', 'humano'),
  ('rescatista', 'Rescatista', 'humano'),
  ('voluntario', 'Voluntario', 'humano');

-- Backfill de integridad: registra cualquier category_code presente en datos antiguos que no
-- esté ya en el catálogo, para que las referencias queden válidas (preserva datos).
INSERT OR IGNORE INTO category (code, label_es, kind)
  SELECT DISTINCT category_code, category_code, 'fisico' FROM need_item
  WHERE category_code IS NOT NULL;
INSERT OR IGNORE INTO category (code, label_es, kind)
  SELECT DISTINCT category_code, category_code, 'fisico' FROM order_item
  WHERE category_code IS NOT NULL;
