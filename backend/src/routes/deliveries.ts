import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { convertToBase } from "../domain/units";
import { getNeedOwnerId } from "../db/logistics-queries";
import {
  getOrCreateInventory,
  getProductById,
  recordTransfer,
} from "../db/inventory-queries";

export const deliveriesRoutes = new Hono<{ Bindings: Env }>();

const directSchema = z.object({
  recipientRef: z.string().optional(),
  needId: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        declaredQty: z.number().positive(),
        declaredUnit: z.string().min(1),
      }),
    )
    .min(1)
    .max(50),
});

// POST /deliveries/direct — entrega directa donante→necesitado (en mano, sin orden) (US5).
deliveriesRoutes.post("/direct", async (c) => {
  try {
    const donorId = await getSessionIdentity(c);
    if (!donorId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);
    const parsed = directSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);

    // El destinatario sale de la necesidad atendida o de una referencia pública.
    const recipientId = parsed.data.needId
      ? await getNeedOwnerId(c.env, parsed.data.needId)
      : parsed.data.recipientRef;
    if (!recipientId) throw new AppError("NO_RECIPIENT", "Indica el destinatario o la necesidad", 400);
    if (recipientId === donorId) throw new AppError("VALIDATION_ERROR", "Destinatario inválido", 400);

    const now = Date.now();
    const donorInv = await getOrCreateInventory(c.env, donorId, "personal", now);
    const recipientInv = await getOrCreateInventory(c.env, recipientId, "personal", now);

    for (const item of parsed.data.items) {
      const product = await getProductById(c.env, item.productId);
      if (!product) throw new AppError("NOT_FOUND", `Producto ${item.productId} no encontrado`, 404);
      let qtyBase: number;
      try {
        qtyBase = await convertToBase(c.env, product.dimension, item.declaredQty, item.declaredUnit);
      } catch {
        throw new AppError("BAD_UNIT", "Unidad no compatible con el producto", 400);
      }
      await recordTransfer(c.env, {
        fromInventoryId: donorInv,
        toInventoryId: recipientInv,
        productId: product.id,
        qtyBase,
        declaredUnit: item.declaredUnit,
        declaredQty: item.declaredQty,
        outType: "entrega_directa_salida",
        inType: "entrada_directa",
        now,
      });
    }
    return c.json({ ok: true, items: parsed.data.items.length }, 201);
  } catch (err) {
    return sendError(c, err);
  }
});
