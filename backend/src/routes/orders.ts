import { Hono } from "hono";
import { z } from "zod";
import type { Context } from "hono";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { isWithinVenezuela, obfuscate, resolveRegion } from "../domain/geo";
import { canTransitionOrder } from "../domain/order-state";
import { encryptCoord, decryptCoord } from "../lib/encryption";
import { generateCode, hashCode, verifyCode } from "../lib/codes";
import { broadcastToOrder } from "../lib/delivery-realtime";
import { broadcastToRegion } from "../lib/realtime";
import { recordAudit } from "../lib/audit";
import { pushToIdentities, pushToTag } from "../lib/notifications";
import { getNeedRow, getNeedPublic } from "../db/queries";
import {
  createOrder,
  getNeedOwnerId,
  getOrderPublic,
  getOrderRow,
  getSupportByIdentity,
  listAvailableOrders,
  releaseOrder,
  setOrderStatus,
  takeOrder,
} from "../db/logistics-queries";

export const ordersRoutes = new Hono<{ Bindings: Env }>();

async function requireSession(c: Context<{ Bindings: Env }>): Promise<string> {
  const id = await getSessionIdentity(c);
  if (!id) throw new AppError("UNAUTHENTICATED", "Inicia sesión para continuar", 401);
  return id;
}

const createSchema = z.object({
  needId: z.string(),
  pickupLocation: z.object({ lat: z.number(), lng: z.number() }),
});

// POST /orders — el donante prepara recursos y publica una orden desde una necesidad pendiente.
ordersRoutes.post("/", async (c) => {
  try {
    const donorId = await requireSession(c);
    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const { needId, pickupLocation } = parsed.data;

    const need = await getNeedRow(c.env, needId);
    if (!need) throw new AppError("NOT_FOUND", "Necesidad no encontrada", 404);
    if (need.status !== "pendiente")
      throw new AppError("NEED_NOT_AVAILABLE", "La necesidad ya no está disponible", 409);

    if (!isWithinVenezuela(pickupLocation.lat, pickupLocation.lng))
      throw new AppError("OUT_OF_BOUNDS", "Ubicación de recogida fuera de Venezuela", 400);

    const pickupZone = obfuscate(pickupLocation.lat, pickupLocation.lng);
    const regionCode = resolveRegion(pickupZone.lat, pickupZone.lng);
    const pickupExact = await encryptCoord(c.env, pickupLocation.lat, pickupLocation.lng);

    // Copia los insumos de la necesidad a la orden.
    const { results: items } = await c.env.DB.prepare(
      `SELECT category_code, quantity FROM need_item WHERE need_id = ?`,
    )
      .bind(needId)
      .all<{ category_code: string; quantity: string | null }>();

    // Códigos de un solo uso (se devuelven; en producción el de entrega se enruta al necesitado).
    const pickupCode = generateCode();
    const dropoffCode = generateCode();
    const now = Date.now();

    const orderId = await createOrder(c.env, {
      needId,
      donorIdentityId: donorId,
      pickupZoneLat: pickupZone.lat,
      pickupZoneLng: pickupZone.lng,
      pickupExactEnc: pickupExact.enc,
      pickupExactIv: pickupExact.iv,
      // El destino exacto es la ubicación exacta cifrada de la necesidad (misma clave).
      dropoffExactEnc: need.exact_enc,
      dropoffExactIv: need.exact_iv,
      regionCode,
      pickupCodeHash: await hashCode(pickupCode),
      dropoffCodeHash: await hashCode(dropoffCode),
      items: items.map((i) => ({ categoryCode: i.category_code, quantity: i.quantity })),
      now,
    });

    // Marca la necesidad como comprometida y refléjalo en el mapa público.
    await c.env.DB.prepare(`UPDATE need SET status = 'comprometida', updated_at = ? WHERE id = ?`)
      .bind(now, needId)
      .run();
    await recordAudit(c.env, {
      needId,
      action: "committed",
      fromStatus: "pendiente",
      toStatus: "comprometida",
      now,
    });
    const updatedNeed = await getNeedPublic(c.env, needId);
    if (updatedNeed)
      await broadcastToRegion(c.env, need.region_code, { type: "need.updated", need: updatedNeed });

    const order = await getOrderPublic(c.env, orderId);

    // Push: al necesitado (ayuda en preparación) y a los transportistas (orden disponible).
    const appUrl = c.env.ALLOWED_ORIGIN;
    c.executionCtx.waitUntil(
      Promise.all([
        pushToIdentities(c.env, [need.owner_identity_id], {
          title: "Ayuda en preparación",
          body: "Un donante preparó recursos para tu necesidad.",
          url: appUrl,
        }),
        pushToTag(c.env, "role_transportista", "true", {
          title: "Nueva orden de entrega",
          body: "Hay una orden disponible para llevar. Toca para tomarla.",
          url: appUrl,
        }),
      ]),
    );

    // NOTA MVP: `dropoffCode` debe enrutarse al necesitado (su dashboard, US5) y NO mostrarse
    // al donante; se devuelve aquí junto al de recogida solo para habilitar el flujo y las
    // pruebas antes de existir el dashboard del necesitado.
    return c.json({ order, pickupCode, dropoffCode }, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /orders — órdenes disponibles por bbox (sin direcciones exactas).
ordersRoutes.get("/", async (c) => {
  try {
    const bboxRaw = c.req.query("bbox");
    if (!bboxRaw) throw new AppError("VALIDATION_ERROR", "Falta bbox", 400);
    const p = bboxRaw.split(",").map(Number);
    if (p.length !== 4 || p.some((n) => !Number.isFinite(n)))
      throw new AppError("VALIDATION_ERROR", "bbox inválido", 400);
    const [minLng, minLat, maxLng, maxLat] = p as [number, number, number, number];
    const limit = Math.min(Number(c.req.query("limit")) || 200, 500);
    const orders = await listAvailableOrders(c.env, { minLng, minLat, maxLng, maxLat, limit });
    return c.json({ orders, count: orders.length });
  } catch (err) {
    return sendError(c, err);
  }
});

// POST /orders/:id/take — el transportista toma la orden (exclusivo).
ordersRoutes.post("/:id/take", async (c) => {
  try {
    const identityId = await requireSession(c);
    const support = await getSupportByIdentity(c.env, identityId);
    if (!support) throw new AppError("NOT_SUPPORT", "Regístrate como personal de apoyo", 403);
    if (support.status !== "activo")
      throw new AppError("SUSPENDED", "Tu perfil está suspendido", 403);

    const id = c.req.param("id");
    const now = Date.now();
    const ok = await takeOrder(c.env, id, support.id, now);
    if (!ok) throw new AppError("ALREADY_TAKEN", "La orden ya fue tomada", 409);

    const row = await getOrderRow(c.env, id);
    await broadcastToOrder(c.env, id, { type: "order.status", status: "tomada", at: now });

    // Push: a donante y necesitado, un transportista tomó la entrega.
    if (row) {
      const needyId = await getNeedOwnerId(c.env, row.need_id);
      c.executionCtx.waitUntil(
        pushToIdentities(c.env, [row.donor_identity_id, needyId ?? ""], {
          title: "Transportista en camino",
          body: "Un transportista tomó la entrega de la ayuda.",
          url: c.env.ALLOWED_ORIGIN,
        }),
      );
    }

    // Al asignado se le revelan las direcciones exactas (descifradas).
    const pickupExact =
      row?.pickup_exact_enc && row.pickup_exact_iv
        ? await decryptCoord(c.env, row.pickup_exact_enc, row.pickup_exact_iv)
        : null;
    const dropoffExact =
      row?.dropoff_exact_enc && row.dropoff_exact_iv
        ? await decryptCoord(c.env, row.dropoff_exact_enc, row.dropoff_exact_iv)
        : null;

    return c.json({ order: await getOrderPublic(c.env, id), pickupExact, dropoffExact });
  } catch (err) {
    return sendError(c, err);
  }
});

const codeSchema = z.object({ code: z.string().min(4).max(20) });

// POST /orders/:id/pickup — confirma recogida con el código del donante.
ordersRoutes.post("/:id/pickup", async (c) => {
  return advanceWithCode(c, "recogida", (row) => row.pickup_code_hash);
});

// POST /orders/:id/deliver — confirma entrega con el código del necesitado.
ordersRoutes.post("/:id/deliver", async (c) => {
  return advanceWithCode(c, "entregada", (row) => row.dropoff_code_hash);
});

async function advanceWithCode(
  c: Context<{ Bindings: Env }>,
  target: "recogida" | "entregada",
  hashOf: (row: NonNullable<Awaited<ReturnType<typeof getOrderRow>>>) => string,
) {
  try {
    const identityId = await requireSession(c);
    const support = await getSupportByIdentity(c.env, identityId);
    if (!support) throw new AppError("NOT_SUPPORT", "No eres personal de apoyo", 403);

    const id = c.req.param("id")!;
    const parsed = codeSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Código requerido", 400);

    const row = await getOrderRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Orden no encontrada", 404);
    if (row.support_person_id !== support.id)
      throw new AppError("FORBIDDEN", "No eres el transportista asignado", 403);
    if (!canTransitionOrder(row.status, target))
      throw new AppError("INVALID_STATE", `No se puede pasar a ${target}`, 409);
    if (!(await verifyCode(parsed.data.code, hashOf(row))))
      throw new AppError("BAD_CODE", "Código incorrecto", 422);

    const now = Date.now();
    await setOrderStatus(c.env, id, target, now, { delivered: target === "entregada" });
    await broadcastToOrder(c.env, id, { type: "order.status", status: target, at: now });

    // Push a donante y necesitado: recogida (en camino) o entrega completada.
    const needyId = await getNeedOwnerId(c.env, row.need_id);
    const pushMsg =
      target === "entregada"
        ? { title: "¡Entrega completada!", body: "La ayuda fue entregada al destino." }
        : { title: "Insumos recogidos", body: "El transportista recogió la ayuda y va en camino." };
    c.executionCtx.waitUntil(
      pushToIdentities(c.env, [row.donor_identity_id, needyId ?? ""], {
        ...pushMsg,
        url: c.env.ALLOWED_ORIGIN,
      }),
    );

    if (target === "entregada") {
      // Cierra la necesidad y actualiza la reputación del transportista.
      await c.env.DB.prepare(`UPDATE need SET status = 'entregada', updated_at = ? WHERE id = ?`)
        .bind(now, row.need_id)
        .run();
      await c.env.DB.prepare(
        `UPDATE support_person SET deliveries_done = deliveries_done + 1 WHERE id = ?`,
      )
        .bind(support.id)
        .run();
      await recordAudit(c.env, {
        needId: row.need_id,
        action: "delivered",
        toStatus: "entregada",
        now,
      });
      await broadcastToRegion(c.env, row.region_code, {
        type: "need.closed",
        id: row.need_id,
        reason: "entregada",
      });
    }
    return c.json({ order: await getOrderPublic(c.env, id) });
  } catch (err) {
    return sendError(c, err);
  }
}

// POST /orders/:id/release — el transportista libera la orden → disponible.
ordersRoutes.post("/:id/release", async (c) => {
  try {
    const identityId = await requireSession(c);
    const support = await getSupportByIdentity(c.env, identityId);
    if (!support) throw new AppError("NOT_SUPPORT", "No eres personal de apoyo", 403);
    const id = c.req.param("id");
    const row = await getOrderRow(c.env, id);
    if (!row) throw new AppError("NOT_FOUND", "Orden no encontrada", 404);
    if (row.support_person_id !== support.id)
      throw new AppError("FORBIDDEN", "No eres el transportista asignado", 403);

    const now = Date.now();
    await releaseOrder(c.env, id, now);
    await broadcastToOrder(c.env, id, { type: "order.status", status: "disponible", at: now });
    return c.json({ order: await getOrderPublic(c.env, id) });
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /orders/:id — detalle (vista pública básica para las partes).
ordersRoutes.get("/:id", async (c) => {
  const order = await getOrderPublic(c.env, c.req.param("id"));
  if (!order) return c.json({ error: { code: "NOT_FOUND", message: "Orden no encontrada" } }, 404);
  return c.json(order);
});
