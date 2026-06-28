-- Órdenes de prueba disponibles (mapa del voluntario). Borrar:
--   DELETE FROM order_item WHERE id LIKE 'seed-oitem-%'; DELETE FROM delivery_order WHERE id LIKE 'seed-order-%';
--   DELETE FROM identity WHERE id='seed-donor-id';

-- Órdenes de prueba disponibles (para ver el mapa del voluntario). IDs seed-order-*.
INSERT OR IGNORE INTO identity (id, channel, contact_hash, created_at, last_seen_at)
VALUES ('seed-donor-id', 'email', 'seed-donor-hash', 1782648198000, 1782648198000);

INSERT OR IGNORE INTO delivery_order
  (id, need_id, donor_identity_id, status, pickup_zone_lat, pickup_zone_lng,
   region_code, pickup_code_hash, dropoff_code_hash, created_at, updated_at) VALUES
 ('seed-order-01','seed-need-02','seed-donor-id','disponible',10.0400,-69.2850,'LAR','seedhash','seedhash',1782648198000,1782648198000),
 ('seed-order-02','seed-need-05','seed-donor-id','disponible',10.0680,-69.3000,'LAR','seedhash','seedhash',1782648198000,1782648198000);

INSERT OR IGNORE INTO order_item (id, order_id, category_code, quantity, product_id) VALUES
 ('seed-oitem-01','seed-order-01','alimentos','para 15 personas',NULL),
 ('seed-oitem-02','seed-order-02','abrigo','5 colchonetas',NULL);
