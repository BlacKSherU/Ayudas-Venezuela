import type { Env, OrderPublic, OrderStatus } from "../types";
import { newId } from "../lib/ids";

// ---- Personal de apoyo -----------------------------------------------------

export interface SupportRow {
  id: string;
  identity_id: string;
  role_code: string;
  status: "activo" | "suspendido";
  rating_avg: number;
  rating_count: number;
  deliveries_done: number;
  reports_count: number;
}

export async function getSupportByIdentity(
  env: Env,
  identityId: string,
): Promise<SupportRow | null> {
  return env.DB.prepare(
    `SELECT id, identity_id, role_code, status, rating_avg, rating_count, deliveries_done, reports_count
     FROM support_person WHERE identity_id = ?`,
  )
    .bind(identityId)
    .first<SupportRow>();
}

export async function getSupportById(env: Env, id: string): Promise<SupportRow | null> {
  return env.DB.prepare(
    `SELECT id, identity_id, role_code, status, rating_avg, rating_count, deliveries_done, reports_count
     FROM support_person WHERE id = ?`,
  )
    .bind(id)
    .first<SupportRow>();
}

export async function createSupport(
  env: Env,
  params: {
    identityId: string;
    roleCode: string;
    cedulaEnc: string;
    cedulaIv: string;
    cedulaPhotoKey: string | null;
    keyVersion: number;
    now: number;
  },
): Promise<string> {
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO support_person
       (id, identity_id, role_code, cedula_enc, cedula_iv, cedula_photo_key, key_version, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', ?)`,
  )
    .bind(
      id,
      params.identityId,
      params.roleCode,
      params.cedulaEnc,
      params.cedulaIv,
      params.cedulaPhotoKey,
      params.keyVersion,
      params.now,
    )
    .run();
  return id;
}

// ---- Órdenes de entrega ----------------------------------------------------

export interface OrderRow {
  id: string;
  need_id: string;
  donor_identity_id: string;
  support_person_id: string | null;
  status: OrderStatus;
  pickup_zone_lat: number;
  pickup_zone_lng: number;
  pickup_exact_enc: string | null;
  pickup_exact_iv: string | null;
  dropoff_exact_enc: string | null;
  dropoff_exact_iv: string | null;
  region_code: string;
  pickup_code_hash: string;
  dropoff_code_hash: string;
  eta_ms: number | null;
  created_at: number;
  updated_at: number;
  taken_at: number | null;
  delivered_at: number | null;
}

interface OrderItemRow {
  order_id: string;
  category_code: string;
  quantity: string | null;
}

export async function getOrderRow(env: Env, id: string): Promise<OrderRow | null> {
  return env.DB.prepare(`SELECT * FROM delivery_order WHERE id = ?`).bind(id).first<OrderRow>();
}

async function itemsForOrders(env: Env, ids: string[]): Promise<Map<string, OrderItemRow[]>> {
  const map = new Map<string, OrderItemRow[]>();
  if (ids.length === 0) return map;
  const ph = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT order_id, category_code, quantity FROM order_item WHERE order_id IN (${ph})`,
  )
    .bind(...ids)
    .all<OrderItemRow>();
  for (const r of results) {
    const l = map.get(r.order_id) ?? [];
    l.push(r);
    map.set(r.order_id, l);
  }
  return map;
}

export function toOrderPublic(row: OrderRow, items: OrderItemRow[]): OrderPublic {
  return {
    id: row.id,
    needId: row.need_id,
    status: row.status,
    pickupZone: { lat: row.pickup_zone_lat, lng: row.pickup_zone_lng },
    regionCode: row.region_code,
    items: items.map((i) => ({ categoryCode: i.category_code, quantity: i.quantity })),
    etaMs: row.eta_ms,
    updatedAt: row.updated_at,
  };
}

export async function getOrderPublic(env: Env, id: string): Promise<OrderPublic | null> {
  const row = await getOrderRow(env, id);
  if (!row) return null;
  const items = (await itemsForOrders(env, [id])).get(id) ?? [];
  return toOrderPublic(row, items);
}

export interface CreateOrderInput {
  needId: string;
  donorIdentityId: string;
  pickupZoneLat: number;
  pickupZoneLng: number;
  pickupExactEnc: string;
  pickupExactIv: string;
  dropoffExactEnc: string | null;
  dropoffExactIv: string | null;
  regionCode: string;
  pickupCodeHash: string;
  dropoffCodeHash: string;
  items: { categoryCode: string; quantity: string | null; productId?: string | null }[];
  now: number;
}

export async function createOrder(env: Env, input: CreateOrderInput): Promise<string> {
  const id = newId();
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO delivery_order
         (id, need_id, donor_identity_id, status, pickup_zone_lat, pickup_zone_lng,
          pickup_exact_enc, pickup_exact_iv, dropoff_exact_enc, dropoff_exact_iv,
          region_code, pickup_code_hash, dropoff_code_hash, created_at, updated_at)
       VALUES (?, ?, ?, 'disponible', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      input.needId,
      input.donorIdentityId,
      input.pickupZoneLat,
      input.pickupZoneLng,
      input.pickupExactEnc,
      input.pickupExactIv,
      input.dropoffExactEnc,
      input.dropoffExactIv,
      input.regionCode,
      input.pickupCodeHash,
      input.dropoffCodeHash,
      input.now,
      input.now,
    ),
  ];
  for (const it of input.items) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO order_item (id, order_id, category_code, quantity, product_id) VALUES (?, ?, ?, ?, ?)`,
      ).bind(newId(), id, it.categoryCode, it.quantity, it.productId ?? null),
    );
  }
  await env.DB.batch(stmts);
  return id;
}

export async function listAvailableOrders(
  env: Env,
  f: { minLng: number; minLat: number; maxLng: number; maxLat: number; limit: number },
): Promise<OrderPublic[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM delivery_order
     WHERE status = 'disponible'
       AND pickup_zone_lat BETWEEN ? AND ?
       AND pickup_zone_lng BETWEEN ? AND ?
     ORDER BY updated_at DESC LIMIT ?`,
  )
    .bind(f.minLat, f.maxLat, f.minLng, f.maxLng, f.limit)
    .all<OrderRow>();
  const items = await itemsForOrders(env, results.map((r) => r.id));
  return results.map((r) => toOrderPublic(r, items.get(r.id) ?? []));
}

/** Toma exclusiva de una orden (disponible → tomada) por un transportista. */
export async function takeOrder(
  env: Env,
  orderId: string,
  supportId: string,
  now: number,
): Promise<boolean> {
  const res = await env.DB.prepare(
    `UPDATE delivery_order
     SET status = 'tomada', support_person_id = ?, taken_at = ?, updated_at = ?
     WHERE id = ? AND status = 'disponible'`,
  )
    .bind(supportId, now, now, orderId)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

/** Actualiza el estado de una orden (con marca temporal). */
export async function setOrderStatus(
  env: Env,
  orderId: string,
  status: OrderStatus,
  now: number,
  extra: { delivered?: boolean } = {},
): Promise<void> {
  if (extra.delivered) {
    await env.DB.prepare(
      `UPDATE delivery_order SET status = ?, delivered_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(status, now, now, orderId)
      .run();
  } else {
    await env.DB.prepare(`UPDATE delivery_order SET status = ?, updated_at = ? WHERE id = ?`)
      .bind(status, now, orderId)
      .run();
  }
}

/** Devuelve el identityId del dueño (necesitado) de una necesidad. */
export async function getNeedOwnerId(env: Env, needId: string): Promise<string | null> {
  const r = await env.DB.prepare(`SELECT owner_identity_id FROM need WHERE id = ?`)
    .bind(needId)
    .first<{ owner_identity_id: string }>();
  return r?.owner_identity_id ?? null;
}

/** Libera una orden de vuelta a disponible (quita el transportista). */
export async function releaseOrder(env: Env, orderId: string, now: number): Promise<void> {
  await env.DB.prepare(
    `UPDATE delivery_order SET status = 'disponible', support_person_id = NULL, taken_at = NULL, updated_at = ? WHERE id = ?`,
  )
    .bind(now, orderId)
    .run();
}
