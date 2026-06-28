-- Migración 0007 — Evidencias de la orden (feature 4). Todas opcionales.
-- donation_evidence: foto que sube el donante al publicar la orden.
-- pickup_evidence: foto que sube el repartidor al recoger (recibo).
-- delivery_evidence: foto que sube el repartidor al entregar.
ALTER TABLE delivery_order ADD COLUMN donation_evidence_key TEXT;
ALTER TABLE delivery_order ADD COLUMN pickup_evidence_key TEXT;
ALTER TABLE delivery_order ADD COLUMN delivery_evidence_key TEXT;
