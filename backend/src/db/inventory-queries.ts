import type { Env } from "../types";
import { newId } from "../lib/ids";
import { normalizeName } from "../domain/normalize";
import { balanceDelta, DIRECTION, type MovementType } from "../domain/ledger";
import type { Dimension } from "../domain/units";

// ---- Productos y categorías ------------------------------------------------

export interface ProductRow {
  id: string;
  name: string;
  normalized_name: string;
  category_code: string;
  dimension: Dimension;
  base_unit: string;
}

export interface ProductView {
  id: string;
  name: string;
  categoryCode: string;
  dimension: Dimension;
  baseUnit: string;
}

function toProductView(r: ProductRow): ProductView {
  return {
    id: r.id,
    name: r.name,
    categoryCode: r.category_code,
    dimension: r.dimension,
    baseUnit: r.base_unit,
  };
}

export async function getProductById(env: Env, id: string): Promise<ProductRow | null> {
  return env.DB.prepare(`SELECT * FROM product WHERE id = ?`).bind(id).first<ProductRow>();
}

export async function searchProducts(
  env: Env,
  opts: { search?: string; category?: string; limit: number },
): Promise<ProductView[]> {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  if (opts.search) {
    conditions.push("normalized_name LIKE ?");
    binds.push(`%${normalizeName(opts.search)}%`);
  }
  if (opts.category) {
    conditions.push("category_code = ?");
    binds.push(opts.category);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  binds.push(opts.limit);
  const { results } = await env.DB.prepare(
    `SELECT * FROM product ${where} ORDER BY name LIMIT ?`,
  )
    .bind(...binds)
    .all<ProductRow>();
  return results.map(toProductView);
}

/** Crea o devuelve el producto existente (deduplicación por nombre normalizado, FR-004). */
export async function getOrCreateProduct(
  env: Env,
  input: {
    name: string;
    categoryCode: string;
    dimension: Dimension;
    baseUnit: string;
    createdBy: string;
    now: number;
  },
): Promise<ProductView> {
  const normalized = normalizeName(input.name);
  const existing = await env.DB.prepare(`SELECT * FROM product WHERE normalized_name = ?`)
    .bind(normalized)
    .first<ProductRow>();
  if (existing) return toProductView(existing);

  const id = newId();
  await env.DB.prepare(
    `INSERT INTO product (id, name, normalized_name, category_code, dimension, base_unit, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(normalized_name) DO NOTHING`,
  )
    .bind(id, input.name.trim(), normalized, input.categoryCode, input.dimension, input.baseUnit, input.createdBy, input.now)
    .run();

  // Relee (cubre la carrera de duplicados: si otro lo creó, devolvemos ese).
  const row = await env.DB.prepare(`SELECT * FROM product WHERE normalized_name = ?`)
    .bind(normalized)
    .first<ProductRow>();
  return toProductView(row!);
}

export async function listCategories(env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT code, label_es, kind FROM category ORDER BY label_es`,
  ).all<{ code: string; label_es: string; kind: string }>();
  return results.map((r) => ({ code: r.code, labelEs: r.label_es, kind: r.kind }));
}

// ---- Inventario, saldos y libro -------------------------------------------

export type InventoryKind = "personal" | "transito";

export async function getOrCreateInventory(
  env: Env,
  ownerIdentityId: string,
  kind: InventoryKind,
  now: number,
): Promise<string> {
  const existing = await env.DB.prepare(
    `SELECT id FROM inventory WHERE owner_identity_id = ? AND kind = ?`,
  )
    .bind(ownerIdentityId, kind)
    .first<{ id: string }>();
  if (existing) return existing.id;
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO inventory (id, owner_identity_id, kind, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(id, ownerIdentityId, kind, now)
    .run();
  return id;
}

export async function getBalance(env: Env, inventoryId: string, productId: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT qty_base FROM product_balance WHERE inventory_id = ? AND product_id = ?`,
  )
    .bind(inventoryId, productId)
    .first<{ qty_base: number }>();
  return row?.qty_base ?? 0;
}

export interface MovementInput {
  inventoryId: string;
  productId: string;
  type: MovementType;
  qtyBase: number;
  declaredUnit: string;
  declaredQty: number;
  reason?: string | null;
  counterpartyInventoryId?: string | null;
  orderId?: string | null;
  now: number;
}

function movementStatements(env: Env, m: MovementInput): D1PreparedStatement[] {
  const delta = balanceDelta(m.type, m.qtyBase);
  return [
    env.DB.prepare(
      `INSERT INTO inventory_movement
        (id, inventory_id, product_id, type, direction, qty_base, declared_unit, declared_qty,
         reason, counterparty_inventory_id, order_id, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      newId(),
      m.inventoryId,
      m.productId,
      m.type,
      DIRECTION[m.type],
      m.qtyBase,
      m.declaredUnit,
      m.declaredQty,
      m.reason ?? null,
      m.counterpartyInventoryId ?? null,
      m.orderId ?? null,
      m.now,
    ),
    env.DB.prepare(
      `INSERT INTO product_balance (inventory_id, product_id, qty_base, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(inventory_id, product_id)
       DO UPDATE SET qty_base = qty_base + excluded.qty_base, updated_at = excluded.updated_at`,
    ).bind(m.inventoryId, m.productId, delta, m.now),
  ];
}

/** Registra un movimiento (libro append-only) y actualiza el saldo en la misma transacción. */
export async function recordMovement(env: Env, m: MovementInput): Promise<void> {
  await env.DB.batch(movementStatements(env, m));
}

/** Registra una transferencia (salida en un inventario, entrada en otro) de forma atómica. */
export async function recordTransfer(
  env: Env,
  t: {
    fromInventoryId: string;
    toInventoryId: string;
    productId: string;
    qtyBase: number;
    declaredUnit: string;
    declaredQty: number;
    outType: MovementType;
    inType: MovementType;
    orderId?: string | null;
    now: number;
  },
): Promise<void> {
  const out = movementStatements(env, {
    inventoryId: t.fromInventoryId,
    productId: t.productId,
    type: t.outType,
    qtyBase: t.qtyBase,
    declaredUnit: t.declaredUnit,
    declaredQty: t.declaredQty,
    counterpartyInventoryId: t.toInventoryId,
    orderId: t.orderId,
    now: t.now,
  });
  const inn = movementStatements(env, {
    inventoryId: t.toInventoryId,
    productId: t.productId,
    type: t.inType,
    qtyBase: t.qtyBase,
    declaredUnit: t.declaredUnit,
    declaredQty: t.declaredQty,
    counterpartyInventoryId: t.fromInventoryId,
    orderId: t.orderId,
    now: t.now,
  });
  await env.DB.batch([...out, ...inn]);
}

// ---- Custodia de órdenes (feature 2 → movimientos de inventario) -----------

async function orderProducts(env: Env, orderId: string): Promise<ProductRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT p.* FROM order_item oi JOIN product p ON p.id = oi.product_id
     WHERE oi.order_id = ? AND oi.product_id IS NOT NULL`,
  )
    .bind(orderId)
    .all<ProductRow>();
  return results;
}

/** Recogida de una orden: donante (personal) → transportista (tránsito). */
export async function recordOrderPickup(
  env: Env,
  p: { orderId: string; donorId: string; transporterId: string; now: number },
): Promise<void> {
  const products = await orderProducts(env, p.orderId);
  if (products.length === 0) return;
  const donorInv = await getOrCreateInventory(env, p.donorId, "personal", p.now);
  const transInv = await getOrCreateInventory(env, p.transporterId, "transito", p.now);
  for (const prod of products) {
    await recordTransfer(env, {
      fromInventoryId: donorInv,
      toInventoryId: transInv,
      productId: prod.id,
      qtyBase: 1,
      declaredUnit: prod.base_unit,
      declaredQty: 1,
      outType: "salida_recogida",
      inType: "entrada_recogida",
      orderId: p.orderId,
      now: p.now,
    });
  }
}

/** Entrega de una orden: transportista (tránsito) → necesitado (personal). */
export async function recordOrderDelivery(
  env: Env,
  p: { orderId: string; transporterId: string; recipientId: string; now: number },
): Promise<void> {
  const products = await orderProducts(env, p.orderId);
  if (products.length === 0) return;
  const transInv = await getOrCreateInventory(env, p.transporterId, "transito", p.now);
  const recInv = await getOrCreateInventory(env, p.recipientId, "personal", p.now);
  for (const prod of products) {
    await recordTransfer(env, {
      fromInventoryId: transInv,
      toInventoryId: recInv,
      productId: prod.id,
      qtyBase: 1,
      declaredUnit: prod.base_unit,
      declaredQty: 1,
      outType: "salida_entrega",
      inType: "entrada_entrega",
      orderId: p.orderId,
      now: p.now,
    });
  }
}

// ---- Vistas públicas -------------------------------------------------------

/** Nombre público elegido o alias no personal por defecto. */
export async function getPublicName(env: Env, identityId: string): Promise<string> {
  const row = await env.DB.prepare(`SELECT public_name FROM identity WHERE id = ?`)
    .bind(identityId)
    .first<{ public_name: string | null }>();
  return row?.public_name?.trim() || `Usuario ${identityId.slice(0, 6)}`;
}

export async function getBalancesByOwner(env: Env, ownerIdentityId: string) {
  const { results } = await env.DB.prepare(
    `SELECT pb.qty_base, p.id AS product_id, p.name, p.base_unit, p.category_code, inv.kind
     FROM product_balance pb
     JOIN inventory inv ON inv.id = pb.inventory_id
     JOIN product p ON p.id = pb.product_id
     WHERE inv.owner_identity_id = ? AND pb.qty_base <> 0
     ORDER BY p.name`,
  )
    .bind(ownerIdentityId)
    .all<{ qty_base: number; product_id: string; name: string; base_unit: string; category_code: string; kind: string }>();
  return results.map((r) => ({
    product: { id: r.product_id, name: r.name, baseUnit: r.base_unit, categoryCode: r.category_code },
    kind: r.kind,
    qtyBase: r.qty_base,
  }));
}

export async function getLedgerByOwner(
  env: Env,
  ownerIdentityId: string,
  opts: { productId?: string; limit: number },
) {
  const binds: unknown[] = [ownerIdentityId];
  let productFilter = "";
  if (opts.productId) {
    productFilter = "AND m.product_id = ?";
    binds.push(opts.productId);
  }
  binds.push(opts.limit);
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.type, m.direction, m.qty_base, m.declared_unit, m.declared_qty, m.reason,
            m.order_id, m.at, p.name AS product_name,
            cinv.owner_identity_id AS counterparty_owner
     FROM inventory_movement m
     JOIN inventory inv ON inv.id = m.inventory_id
     JOIN product p ON p.id = m.product_id
     LEFT JOIN inventory cinv ON cinv.id = m.counterparty_inventory_id
     WHERE inv.owner_identity_id = ? ${productFilter}
     ORDER BY m.at DESC, m.id DESC
     LIMIT ?`,
  )
    .bind(...binds)
    .all<{
      id: string;
      type: string;
      direction: string;
      qty_base: number;
      declared_unit: string;
      declared_qty: number;
      reason: string | null;
      order_id: string | null;
      at: number;
      product_name: string;
      counterparty_owner: string | null;
    }>();

  // Resuelve nombres públicos de contrapartes (sin exponer ids personales).
  const out = [];
  for (const r of results) {
    out.push({
      id: r.id,
      type: r.type,
      direction: r.direction,
      qtyBase: r.qty_base,
      declaredUnit: r.declared_unit,
      declaredQty: r.declared_qty,
      reason: r.reason,
      orderId: r.order_id,
      at: r.at,
      product: { name: r.product_name },
      counterparty: r.counterparty_owner
        ? { publicName: await getPublicName(env, r.counterparty_owner), ref: r.counterparty_owner }
        : null,
    });
  }
  return out;
}
