import type { CenterPublic, Env } from "../types";
import { newId } from "../lib/ids";

// Centros de acopio (feature 4). Entidad opcional con ubicación EXACTA pública (punto al que
// la gente acude). Registro abierto + anti-abuso (límite de tasa al crear + reportes que ocultan).

export interface CenterRow {
  id: string;
  owner_identity_id: string;
  name: string;
  lat: number;
  lng: number;
  region_code: string;
  note: string | null;
  status: "activo" | "oculto";
  reports_count: number;
  created_at: number;
}

/** Reportes acumulados que ocultan un centro automáticamente. */
export const REPORT_HIDE_THRESHOLD = 3;
/** Ventana y tope del límite de tasa para crear centros (anti-abuso). */
export const CREATE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
export const CREATE_RATE_MAX = 5;

export function toCenterPublic(r: CenterRow): CenterPublic {
  return {
    id: r.id,
    name: r.name,
    location: { lat: r.lat, lng: r.lng },
    regionCode: r.region_code,
    note: r.note,
  };
}

export async function getCenterRow(env: Env, id: string): Promise<CenterRow | null> {
  return env.DB.prepare(`SELECT * FROM collection_center WHERE id = ?`).bind(id).first<CenterRow>();
}

/** Cuántos centros creó este dueño desde `sinceMs` (para el límite de tasa). */
export async function countRecentCentersByOwner(
  env: Env,
  ownerId: string,
  sinceMs: number,
): Promise<number> {
  const r = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM collection_center WHERE owner_identity_id = ? AND created_at >= ?`,
  )
    .bind(ownerId, sinceMs)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

export interface CreateCenterInput {
  ownerIdentityId: string;
  name: string;
  lat: number;
  lng: number;
  regionCode: string;
  note: string | null;
  now: number;
}

export async function createCenter(env: Env, input: CreateCenterInput): Promise<CenterRow> {
  const id = newId();
  await env.DB.prepare(
    `INSERT INTO collection_center
       (id, owner_identity_id, name, lat, lng, region_code, note, status, reports_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'activo', 0, ?)`,
  )
    .bind(id, input.ownerIdentityId, input.name, input.lat, input.lng, input.regionCode, input.note, input.now)
    .run();
  return {
    id,
    owner_identity_id: input.ownerIdentityId,
    name: input.name,
    lat: input.lat,
    lng: input.lng,
    region_code: input.regionCode,
    note: input.note,
    status: "activo",
    reports_count: 0,
    created_at: input.now,
  };
}

/** Centros activos dentro de un bounding box (para el mapa público). */
export async function listCentersByBbox(
  env: Env,
  f: { minLng: number; minLat: number; maxLng: number; maxLat: number; limit: number },
): Promise<CenterPublic[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM collection_center
     WHERE status = 'activo'
       AND lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?
     ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(f.minLat, f.maxLat, f.minLng, f.maxLng, f.limit)
    .all<CenterRow>();
  return results.map(toCenterPublic);
}

/** Centros del dueño (incluye ocultos, para que pueda gestionarlos). */
export async function listCentersByOwner(env: Env, ownerId: string): Promise<CenterRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT * FROM collection_center WHERE owner_identity_id = ? ORDER BY created_at DESC`,
  )
    .bind(ownerId)
    .all<CenterRow>();
  return results;
}

export async function updateCenter(
  env: Env,
  id: string,
  fields: { name?: string; lat?: number; lng?: number; regionCode?: string; note?: string | null },
): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (fields.name !== undefined) (sets.push("name = ?"), vals.push(fields.name));
  if (fields.lat !== undefined) (sets.push("lat = ?"), vals.push(fields.lat));
  if (fields.lng !== undefined) (sets.push("lng = ?"), vals.push(fields.lng));
  if (fields.regionCode !== undefined) (sets.push("region_code = ?"), vals.push(fields.regionCode));
  if (fields.note !== undefined) (sets.push("note = ?"), vals.push(fields.note));
  if (sets.length === 0) return;
  vals.push(id);
  await env.DB.prepare(`UPDATE collection_center SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();
}

export async function deleteCenter(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM collection_center WHERE id = ?`).bind(id).run();
}

/** Suma un reporte; al alcanzar el umbral, oculta el centro. Devuelve si quedó oculto. */
export async function reportCenter(env: Env, id: string): Promise<{ hidden: boolean }> {
  await env.DB.prepare(
    `UPDATE collection_center
     SET reports_count = reports_count + 1,
         status = CASE WHEN reports_count + 1 >= ? THEN 'oculto' ELSE status END
     WHERE id = ?`,
  )
    .bind(REPORT_HIDE_THRESHOLD, id)
    .run();
  const row = await getCenterRow(env, id);
  return { hidden: row?.status === "oculto" };
}
