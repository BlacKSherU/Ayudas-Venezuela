import { Hono } from "hono";
import { z } from "zod";
import type { Env, NeedStatus, Urgency } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { isWithinVenezuela, resolveRegion } from "../domain/geo";
import { isValidCategory } from "../domain/categories";
import { isRecentDuplicate } from "../lib/dedupe";
import { encryptCoord } from "../lib/encryption";
import { recordAudit } from "../lib/audit";
import { broadcastToRegion } from "../lib/realtime";
import { pushToTag } from "../lib/notifications";
import { sha256Hex } from "../lib/crypto";
import {
  countDelivered,
  createNeed,
  deleteNeed,
  getNeedPublic,
  getNeedRow,
  listNeedsByBbox,
  listNeedsByOwner,
  updateNeedFields,
} from "../db/queries";
import type { Context } from "hono";

export const needsRoutes = new Hono<{ Bindings: Env }>();

async function requireSession(c: Context<{ Bindings: Env }>): Promise<string> {
  const identityId = await getSessionIdentity(c);
  if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión para continuar", 401);
  return identityId;
}

const createSchema = z.object({
  urgency: z.enum(["alta", "media", "baja"]),
  location: z.object({ lat: z.number(), lng: z.number() }),
  items: z
    .array(
      z.object({
        categoryCode: z.string(),
        quantity: z.string().max(60).nullish(),
        productId: z.string().nullish(),
      }),
    )
    .min(1)
    .max(20),
  note: z.string().max(280).nullish(),
  contactPublic: z.string().max(200).nullish(),
  contactPublicConsent: z.boolean().optional(),
});

// GET /needs — lista por bounding box y filtros (público, US2).
needsRoutes.get("/", async (c) => {
  try {
    const bboxRaw = c.req.query("bbox");
    if (!bboxRaw) throw new AppError("VALIDATION_ERROR", "Falta el parámetro bbox", 400);
    const parts = bboxRaw.split(",").map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
      throw new AppError("VALIDATION_ERROR", "bbox inválido", 400);
    }
    const [minLng, minLat, maxLng, maxLat] = parts as [number, number, number, number];
    const status = (c.req.query("status") as NeedStatus) || "pendiente";
    const limit = Math.min(Number(c.req.query("limit")) || 200, 500);

    const needs = await listNeedsByBbox(c.env, {
      minLng,
      minLat,
      maxLng,
      maxLat,
      status,
      category: c.req.query("category") || undefined,
      urgency: (c.req.query("urgency") as Urgency) || undefined,
      limit,
    });
    return c.json({ needs, count: needs.length });
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /needs/mine — necesidades de la persona autenticada (US1).
needsRoutes.get("/mine", async (c) => {
  try {
    const identityId = await requireSession(c);
    const needs = await listNeedsByOwner(c.env, identityId);
    return c.json({ needs });
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /needs/stats — conteo público agregado de resueltas (FR-015).
needsRoutes.get("/stats", async (c) => {
  const delivered = await countDelivered(c.env);
  return c.json({ delivered });
});

// POST /needs — crea una necesidad (requiere sesión, US1).
needsRoutes.post("/", async (c) => {
  try {
    const identityId = await requireSession(c);
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const data = parsed.data;

    // Consentimiento explícito para contacto público (FR-016/FR-011).
    const contactPublic = data.contactPublic?.trim() || null;
    if (contactPublic && !data.contactPublicConsent) {
      throw new AppError(
        "CONSENT_REQUIRED",
        "Debes aceptar que tu contacto será público para incluirlo",
        400,
      );
    }

    // Validación de categorías.
    for (const item of data.items) {
      if (!isValidCategory(item.categoryCode)) {
        throw new AppError("INVALID_CATEGORY", `Categoría inválida: ${item.categoryCode}`, 400);
      }
    }

    // Validación geográfica. Feature 4: ubicación EXACTA pública (sin ofuscación).
    if (!isWithinVenezuela(data.location.lat, data.location.lng)) {
      throw new AppError("OUT_OF_BOUNDS", "La ubicación está fuera de Venezuela", 400);
    }
    const zone = { lat: data.location.lat, lng: data.location.lng };
    const regionCode = resolveRegion(zone.lat, zone.lng);

    // Anti-abuso: duplicados recientes del mismo autor.
    const categoryCodes = data.items.map((i) => i.categoryCode);
    if (await isRecentDuplicate(c.env, identityId, zone.lat, zone.lng, categoryCodes)) {
      throw new AppError("DUPLICATE", "Ya publicaste una necesidad similar hace poco", 409);
    }

    const now = Date.now();
    // Ubicación exacta cifrada (FR-026): nunca pública; solo para entrega/auditoría.
    const exact = await encryptCoord(c.env, data.location.lat, data.location.lng);
    const need = await createNeed(c.env, {
      ownerIdentityId: identityId,
      urgency: data.urgency,
      zoneLat: zone.lat,
      zoneLng: zone.lng,
      regionCode,
      note: data.note?.trim() || null,
      contactPublic,
      items: data.items.map((i) => ({
        categoryCode: i.categoryCode,
        quantity: i.quantity ?? null,
        productId: i.productId ?? null,
      })),
      exactEnc: exact.enc,
      exactIv: exact.iv,
      keyVersion: exact.keyVersion,
      now,
    });

    await recordAudit(c.env, {
      needId: need.id,
      action: "created",
      toStatus: "pendiente",
      actorRef: await sha256Hex(identityId),
      now,
    });
    await broadcastToRegion(c.env, regionCode, { type: "need.created", need });

    // Push a quienes estén suscritos como donantes (FR push: nueva necesidad).
    c.executionCtx.waitUntil(
      pushToTag(c.env, "role_donor", "true", {
        title: "Nueva necesidad cerca",
        body: "Se publicó una nueva necesidad de ayuda. Toca para verla en el mapa.",
        url: c.env.ALLOWED_ORIGIN,
      }),
    );

    return c.json(need, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /needs/:id — detalle público (datos ofuscados).
needsRoutes.get("/:id", async (c) => {
  const need = await getNeedPublic(c.env, c.req.param("id"));
  if (!need) return c.json({ error: { code: "NOT_FOUND", message: "Necesidad no encontrada" } }, 404);
  return c.json(need);
});

const patchSchema = z.object({
  urgency: z.enum(["alta", "media", "baja"]).optional(),
  note: z.string().max(280).nullish(),
  contactPublic: z.string().max(200).nullish(),
  contactPublicConsent: z.boolean().optional(),
});

// PATCH /needs/:id — edita la propia necesidad (solo titular, FR-018).
needsRoutes.patch("/:id", async (c) => {
  try {
    const identityId = await requireSession(c);
    const id = c.req.param("id");
    const row = await getNeedRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Necesidad no encontrada", 404);
    if (row.owner_identity_id !== identityId)
      throw new AppError("FORBIDDEN", "No eres el dueño de esta necesidad", 403);

    const parsed = patchSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const data = parsed.data;

    const contactPublic =
      data.contactPublic === undefined ? undefined : data.contactPublic?.trim() || null;
    if (contactPublic && !data.contactPublicConsent) {
      throw new AppError("CONSENT_REQUIRED", "Debes aceptar que tu contacto será público", 400);
    }

    const now = Date.now();
    await updateNeedFields(c.env, id, {
      urgency: data.urgency,
      note: data.note === undefined ? undefined : data.note?.trim() || null,
      contactPublic,
      now,
    });
    await recordAudit(c.env, { needId: id, action: "edited", actorRef: await sha256Hex(identityId), now });

    const updated = await getNeedPublic(c.env, id);
    if (updated) await broadcastToRegion(c.env, row.region_code, { type: "need.updated", need: updated });
    return c.json(updated);
  } catch (err) {
    return sendError(c, err);
  }
});

// DELETE /needs/:id — elimina la propia necesidad (solo titular).
needsRoutes.delete("/:id", async (c) => {
  try {
    const identityId = await requireSession(c);
    const id = c.req.param("id");
    const row = await getNeedRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Necesidad no encontrada", 404);
    if (row.owner_identity_id !== identityId)
      throw new AppError("FORBIDDEN", "No eres el dueño de esta necesidad", 403);

    await deleteNeed(c.env, id);
    await broadcastToRegion(c.env, row.region_code, { type: "need.closed", id, reason: "eliminada" });
    return c.body(null, 204);
  } catch (err) {
    return sendError(c, err);
  }
});
