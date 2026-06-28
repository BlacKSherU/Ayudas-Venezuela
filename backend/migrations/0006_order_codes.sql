-- Migración 0006 — Códigos de orden en claro para que las partes los consulten (feature 4).
-- pickup_code: lo ve el DONANTE (lo entrega al repartidor en la recogida).
-- dropoff_code: lo ve el NECESITADO (lo entrega al repartidor en la entrega).
-- Se conservan también los hashes existentes para la verificación.
ALTER TABLE delivery_order ADD COLUMN pickup_code TEXT;
ALTER TABLE delivery_order ADD COLUMN dropoff_code TEXT;
