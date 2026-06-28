import type { Env, NeedPublic, NeedStatus, Urgency } from "../types";
import { newId } from "../lib/ids";

interface NeedRow {
  id: string;
  owner_identity_id: string;
  status: NeedStatus;
  urgency: Urgency;
  zone_lat: number;
  zone_lng: number;
  region_code: string;
  contact_public: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
  committed_at: number | null;
}

interface ItemRow {
  need_id: string;
  category_code: string;
  quantity: string | null;
}

function toPublic(row: NeedRow, items: ItemRow[]): NeedPublic {
  return {
    id: row.id,
    status: row.status,
    urgency: row.urgency,
    zone: { lat: row.zone_lat, lng: row.zone_lng },
    regionCode: row.region_code,
    items: items.map((i) => ({ categoryCode: i.category_code, quantity: i.quantity })),
    note: row.note,
    contactPublic: row.contact_public,
    updatedAt: row.updated_at,
  };
}

async function itemsFor(env: Env, needIds: string[]): Promise<Map<string, ItemRow[]>> {
  const byNeed = new Map<string, ItemRow[]>();
  if (needIds.length === 0) return byNeed;
  const placeholders = needIds.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT need_id, category_code, quantity FROM need_item WHERE need_id IN (${placeholders})`,
  )
    .bind(...needIds)
    .all<ItemRow>();
  for (const r of results) {
    const list = byNeed.get(r.need_id) ?? [];
    list.push(r);
    byNeed.set(r.need_id, list);
  }
  return byNeed;
}

export interface CreateNeedInput {
  ownerIdentityId: string;
  urgency: Urgency;
  zoneLat: number;
  zoneLng: number;
  regionCode: string;
  note: string | null;
  contactPublic: string | null;
  items: { categoryCode: string; quantity: string | null }[];
  now: number;
}

export async function createNeed(env: Env, input: CreateNeedInput): Promise<NeedPublic> {
  const id = newId();
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(
      `INSERT INTO need
        (id, owner_identity_id, status, urgency, zone_lat, zone_lng, region_code,
         contact_public, note, created_at, updated_at, committed_at)
       VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(
      id,
      input.ownerIdentityId,
      input.urgency,
      input.zoneLat,
      input.zoneLng,
      input.regionCode,
      input.contactPublic,
      input.note,
      input.now,
      input.now,
    ),
  ];
  for (const item of input.items) {
    stmts.push(
      env.DB.prepare(
        `INSERT INTO need_item (id, need_id, category_code, quantity) VALUES (?, ?, ?, ?)`,
      ).bind(newId(), id, item.categoryCode, item.quantity),
    );
  }
  await env.DB.batch(stmts);
  const created = await getNeedPublic(env, id);
  if (!created) throw new Error("No se pudo crear la necesidad");
  return created;
}

export async function getNeedRow(env: Env, id: string): Promise<NeedRow | null> {
  return env.DB.prepare(`SELECT * FROM need WHERE id = ?`).bind(id).first<NeedRow>();
}

export async function getNeedPublic(env: Env, id: string): Promise<NeedPublic | null> {
  const row = await getNeedRow(env, id);
  if (!row) return null;
  const items = (await itemsFor(env, [id])).get(id) ?? [];
  return toPublic(row, items);
}

export interface ListNeedsFilter {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  status: NeedStatus;
  category?: string;
  urgency?: Urgency;
  limit: number;
}

export async function listNeedsByBbox(env: Env, f: ListNeedsFilter): Promise<NeedPublic[]> {
  const conditions = [
    "n.status = ?",
    "n.zone_lat BETWEEN ? AND ?",
    "n.zone_lng BETWEEN ? AND ?",
  ];
  // Orden de binds: primero el del JOIN (categoría, si existe), luego el WHERE, luego LIMIT.
  const binds: unknown[] = [];
  let join = "";
  if (f.category) {
    join = "JOIN need_item ni ON ni.need_id = n.id AND ni.category_code = ?";
    binds.push(f.category);
  }
  binds.push(f.status, f.minLat, f.maxLat, f.minLng, f.maxLng);
  if (f.urgency) {
    conditions.push("n.urgency = ?");
    binds.push(f.urgency);
  }
  binds.push(f.limit);

  const sql = `SELECT DISTINCT n.* FROM need n ${join}
     WHERE ${conditions.join(" AND ")}
     ORDER BY n.updated_at DESC
     LIMIT ?`;

  const { results } = await env.DB.prepare(sql).bind(...binds).all<NeedRow>();
  const items = await itemsFor(env, results.map((r) => r.id));
  return results.map((r) => toPublic(r, items.get(r.id) ?? []));
}

export async function listNeedsByOwner(env: Env, ownerIdentityId: string): Promise<NeedPublic[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM need WHERE owner_identity_id = ? ORDER BY updated_at DESC`,
  )
    .bind(ownerIdentityId)
    .all<NeedRow>();
  const items = await itemsFor(env, results.map((r) => r.id));
  return results.map((r) => toPublic(r, items.get(r.id) ?? []));
}

export interface UpdateNeedInput {
  urgency?: Urgency;
  note?: string | null;
  contactPublic?: string | null;
  now: number;
}

export async function updateNeedFields(env: Env, id: string, input: UpdateNeedInput): Promise<void> {
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (input.urgency !== undefined) {
    sets.push("urgency = ?");
    binds.push(input.urgency);
  }
  if (input.note !== undefined) {
    sets.push("note = ?");
    binds.push(input.note);
  }
  if (input.contactPublic !== undefined) {
    sets.push("contact_public = ?");
    binds.push(input.contactPublic);
  }
  sets.push("updated_at = ?");
  binds.push(input.now);
  binds.push(id);
  await env.DB.prepare(`UPDATE need SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

export async function deleteNeed(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM need WHERE id = ?`).bind(id).run();
}

/** Conteo público agregado de necesidades resueltas (entregadas), sin datos personales. */
export async function countDelivered(env: Env): Promise<number> {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS c FROM need WHERE status = 'entregada'`).first<{
    c: number;
  }>();
  return row?.c ?? 0;
}
