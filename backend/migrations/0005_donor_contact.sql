-- Migración 0005 — Contacto del donante en la orden (feature 4)
-- El donante puede dar un contacto (teléfono/WhatsApp) para que el voluntario coordine la
-- recogida. El contacto del necesitado ya existe en need.contact_public (opt-in).
ALTER TABLE delivery_order ADD COLUMN donor_contact TEXT;
