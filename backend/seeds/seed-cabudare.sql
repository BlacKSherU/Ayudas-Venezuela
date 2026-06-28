-- Datos de prueba cerca de Cabudare (Lara). Aplicar:
--   wrangler d1 execute ayuda-venezuela --remote --file seeds/seed-cabudare.sql
-- Borrar:  DELETE FROM need WHERE id LIKE 'seed-%'; DELETE FROM need_item WHERE id LIKE 'seed-%';
--          DELETE FROM collection_center WHERE id LIKE 'seed-%'; DELETE FROM identity WHERE id='seed-cabudare-id';

-- Datos de PRUEBA cerca de Cabudare (Lara). IDs con prefijo seed- para poder borrarlos luego.
INSERT OR IGNORE INTO identity (id, channel, contact_hash, created_at, last_seen_at)
VALUES ('seed-cabudare-id', 'email', 'seed-cabudare-hash', 1782626184000, 1782626184000);

-- Necesidades (zona aproximada). exact_enc/iv quedan NULL: son datos de prueba, no para entrega.
INSERT OR IGNORE INTO need (id, owner_identity_id, status, urgency, zone_lat, zone_lng, region_code, note, created_at, updated_at) VALUES
 ('seed-need-01','seed-cabudare-id','pendiente','alta',10.0312,-69.2712,'LAR','Familia sin agua potable (prueba)',1782626184000,1782626184000),
 ('seed-need-02','seed-cabudare-id','pendiente','media',10.0455,-69.2890,'LAR','Comedor comunitario (prueba)',1782626184000,1782626184000),
 ('seed-need-03','seed-cabudare-id','pendiente','alta',10.0201,-69.2555,'LAR','Insumos medicos urgentes (prueba)',1782626184000,1782626184000),
 ('seed-need-04','seed-cabudare-id','pendiente','baja',10.0647,-69.3210,'LAR','Articulos de higiene (prueba)',1782626184000,1782626184000),
 ('seed-need-05','seed-cabudare-id','pendiente','media',10.0730,-69.3050,'LAR','Refugio temporal (prueba)',1782626184000,1782626184000),
 ('seed-need-06','seed-cabudare-id','pendiente','alta',10.0500,-69.2980,'LAR','Panales y formula (prueba)',1782626184000,1782626184000),
 ('seed-need-07','seed-cabudare-id','pendiente','media',10.0100,-69.2800,'LAR','Tanque comunitario de agua (prueba)',1782626184000,1782626184000),
 ('seed-need-08','seed-cabudare-id','pendiente','alta',10.0380,-69.2450,'LAR','Despensa familiar (prueba)',1782626184000,1782626184000),
 ('seed-need-09','seed-cabudare-id','pendiente','media',10.0820,-69.2900,'LAR','Medicinas cronicas (prueba)',1782626184000,1782626184000),
 ('seed-need-10','seed-cabudare-id','pendiente','baja',10.0000,-69.3000,'LAR','Limpieza de albergue (prueba)',1782626184000,1782626184000);

INSERT OR IGNORE INTO need_item (id, need_id, category_code, quantity) VALUES
 ('seed-item-01','seed-need-01','agua','20 litros'),
 ('seed-item-02','seed-need-02','alimentos','para 15 personas'),
 ('seed-item-03','seed-need-03','medicinas','antibioticos'),
 ('seed-item-04','seed-need-04','higiene','jabon y cloro'),
 ('seed-item-05','seed-need-05','abrigo','5 colchonetas'),
 ('seed-item-06','seed-need-06','bebes','talla M'),
 ('seed-item-07','seed-need-07','agua','tanque 500L'),
 ('seed-item-08','seed-need-08','alimentos','arroz y granos'),
 ('seed-item-09','seed-need-09','medicinas','tension/diabetes'),
 ('seed-item-10','seed-need-10','higiene','desinfectante');

-- Centros de acopio (ubicacion exacta publica).
INSERT OR IGNORE INTO collection_center (id, owner_identity_id, name, lat, lng, region_code, note, status, reports_count, created_at) VALUES
 ('seed-center-01','seed-cabudare-id','Centro de Acopio Cabudare',10.0312,-69.2712,'LAR','L-V 8am-5pm (prueba)','activo',0,1782626184000),
 ('seed-center-02','seed-cabudare-id','Acopio Barquisimeto Centro',10.0647,-69.3570,'LAR','Todos los dias 9am-6pm (prueba)','activo',0,1782626184000),
 ('seed-center-03','seed-cabudare-id','Iglesia Agua Viva - Acopio',10.0455,-69.2890,'LAR','Sab-Dom 8am-12m (prueba)','activo',0,1782626184000);
