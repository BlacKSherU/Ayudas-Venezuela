import { Hono } from "hono";
import { z } from "zod";
import type { Context } from "hono";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { isWithinVenezuela, resolveRegion } from "../domain/geo";
import { broadcastToRegion } from "../lib/realtime";
import {
  CREATE_RATE_MAX,
  CREATE_RATE_WINDOW_MS,
  countRecentCentersByOwner,
  createCenter,
  deleteCenter,
  getCenterRow,
  listCentersByBbox,
  listCentersByOwner,
  reportCenter,
  toCenterPublic,
  updateCenter,
} from "../db/centers-queries";

export const centersRoutes = new Hono<{ Bindings: Env }>();

async function requireSession(c: Context<{ Bindings: Env }>): Promise<string> {
  const id = await getSessionIdentity(c);
  if (!id) throw new AppError("UNAUTHENTICATED", "Inicia sesión para continuar", 401);
  return id;
}

const createSchema = z.object({
  name: z.string().trim().min(3).max(80),
  location: z.object({ lat: z.number(), lng: z.number() }),
  note: z.string().max(200).nullish(),
});

// GET /centers?bbox= — lista pública de centros activos por bounding box (para el mapa).
centersRoutes.get("/", async (c) => {
  try {
    const bboxRaw = c.req.query("bbox");
    if (!bboxRaw) throw new AppError("VALIDATION_ERROR", "Falta el parámetro bbox", 400);
    const p = bboxRaw.split(",").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n)))
      throw new AppError("VALIDATION_ERROR", "bbox inválido", 400);
    const [minLng, minLat, maxLng, maxLat] = p as [number, number, number, number];
    const limit = Math.min(Number(c.req.query("limit")) || 200, 500);
    const centers = await listCentersByBbox(c.env, { minLng, minLat, maxLng, maxLat, limit });
    return c.json({ centers, count: centers.length });
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /centers/mine — centros del usuario autenticado (incluye ocultos para gestionarlos).
centersRoutes.get("/mine", async (c) => {
  try {
    const identityId = await requireSession(c);
    const rows = await listCentersByOwner(c.env, identityId);
    return c.json({
      centers: rows.map((r) => ({
        ...toCenterPublic(r),
        status: r.status,
        reportsCount: r.reports_count,
      })),
    });
  } catch (err) {
    return sendError(c, err);
  }
});

// POST /centers — registra un centro. Sesión + anti-abuso (límite de tasa) + dentro de Venezuela.
centersRoutes.post("/", async (c) => {
  try {
    const identityId = await requireSession(c);
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const data = parsed.data;

    if (!isWithinVenezuela(data.location.lat, data.location.lng))
      throw new AppError("OUT_OF_BOUNDS", "La ubicación está fuera de Venezuela", 400);

    const now = Date.now();
    const recent = await countRecentCentersByOwner(c.env, identityId, now - CREATE_RATE_WINDOW_MS);
    if (recent >= CREATE_RATE_MAX)
      throw new AppError("RATE_LIMITED", "Has registrado demasiados centros; intenta más tarde", 429);

    // Ubicación EXACTA (punto público), a diferencia de las necesidades (ofuscadas).
    const regionCode = resolveRegion(data.location.lat, data.location.lng);
    const row = await createCenter(c.env, {
      ownerIdentityId: identityId,
      name: data.name,
      lat: data.location.lat,
      lng: data.location.lng,
      regionCode,
      note: data.note?.trim() || null,
      now,
    });

    const center = toCenterPublic(row);
    await broadcastToRegion(c.env, regionCode, { type: "center.created", center });
    return c.json(center, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

const patchSchema = z.object({
  name: z.string().trim().min(3).max(80).optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).optional(),
  note: z.string().max(200).nullish(),
});

// PATCH /centers/:id — edita un centro propio (solo dueño).
centersRoutes.patch("/:id", async (c) => {
  try {
    const identityId = await requireSession(c);
    const id = c.req.param("id");
    const row = await getCenterRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Centro no encontrado", 404);
    if (row.owner_identity_id !== identityId)
      throw new AppError("FORBIDDEN", "No eres el dueño de este centro", 403);

    const parsed = patchSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const data = parsed.data;

    if (data.location && !isWithinVenezuela(data.location.lat, data.location.lng))
      throw new AppError("OUT_OF_BOUNDS", "La ubicación está fuera de Venezuela", 400);

    await updateCenter(c.env, id, {
      name: data.name,
      lat: data.location?.lat,
      lng: data.location?.lng,
      regionCode: data.location ? resolveRegion(data.location.lat, data.location.lng) : undefined,
      note: data.note === undefined ? undefined : data.note?.trim() || null,
    });
    const updated = await getCenterRow(c.env, id);
    return c.json(updated ? toCenterPublic(updated) : null);
  } catch (err) {
    return sendError(c, err);
  }
});

// DELETE /centers/:id — elimina un centro propio (solo dueño).
centersRoutes.delete("/:id", async (c) => {
  try {
    const identityId = await requireSession(c);
    const id = c.req.param("id");
    const row = await getCenterRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Centro no encontrado", 404);
    if (row.owner_identity_id !== identityId)
      throw new AppError("FORBIDDEN", "No eres el dueño de este centro", 403);
    await deleteCenter(c.env, id);
    await broadcastToRegion(c.env, row.region_code, { type: "center.removed", id });
    return c.body(null, 204);
  } catch (err) {
    return sendError(c, err);
  }
});

// POST /centers/:id/report — reporte comunitario anti-abuso (público). Oculta al superar umbral.
centersRoutes.post("/:id/report", async (c) => {
  try {
    const id = c.req.param("id");
    const row = await getCenterRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Centro no encontrado", 404);
    const res = await reportCenter(c.env, id);
    if (res.hidden) await broadcastToRegion(c.env, row.region_code, { type: "center.removed", id });
    return c.json({ ok: true, hidden: res.hidden });
  } catch (err) {
    return sendError(c, err);
  }
});
