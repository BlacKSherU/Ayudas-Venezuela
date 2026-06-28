import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { convertToBase } from "../domain/units";
import { DECREASE_REASONS } from "../domain/ledger";
import {
  getBalance,
  getBalancesByOwner,
  getGlobalLedger,
  getLedgerByOwner,
  getOrCreateInventory,
  getProductById,
  getPublicName,
  recordMovement,
} from "../db/inventory-queries";

export const inventoryRoutes = new Hono<{ Bindings: Env }>();

const itemSchema = z.object({
  productId: z.string(),
  declaredQty: z.number().positive(),
  declaredUnit: z.string().min(1),
});

// POST /inventory/items — alta manual de unidades al inventario propio (US2). Requiere sesión.
inventoryRoutes.post("/items", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);
    const parsed = itemSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);

    const product = await getProductById(c.env, parsed.data.productId);
    if (!product) throw new AppError("NOT_FOUND", "Producto no encontrado", 404);

    let qtyBase: number;
    try {
      qtyBase = await convertToBase(c.env, product.dimension, parsed.data.declaredQty, parsed.data.declaredUnit);
    } catch {
      throw new AppError("BAD_UNIT", "Unidad no compatible con el producto", 400);
    }

    const now = Date.now();
    const invId = await getOrCreateInventory(c.env, identityId, "personal", now);
    await recordMovement(c.env, {
      inventoryId: invId,
      productId: product.id,
      type: "alta",
      qtyBase,
      declaredUnit: parsed.data.declaredUnit,
      declaredQty: parsed.data.declaredQty,
      now,
    });
    return c.json({ productId: product.id, qtyBase: await getBalance(c.env, invId, product.id) }, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

const decreaseSchema = z.object({
  declaredQty: z.number().positive(),
  declaredUnit: z.string().min(1),
  reason: z.enum(["consumido", "roto", "extraviado", "estropeado"]),
});

// POST /inventory/items/:productId/decrease — baja por consumo/daño/pérdida (US4). Requiere sesión.
inventoryRoutes.post("/items/:productId/decrease", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);
    const productId = c.req.param("productId");
    const parsed = decreaseSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    if (!DECREASE_REASONS.includes(parsed.data.reason))
      throw new AppError("VALIDATION_ERROR", "Motivo inválido", 400);

    const product = await getProductById(c.env, productId);
    if (!product) throw new AppError("NOT_FOUND", "Producto no encontrado", 404);

    let qtyBase: number;
    try {
      qtyBase = await convertToBase(c.env, product.dimension, parsed.data.declaredQty, parsed.data.declaredUnit);
    } catch {
      throw new AppError("BAD_UNIT", "Unidad no compatible con el producto", 400);
    }

    const now = Date.now();
    const invId = await getOrCreateInventory(c.env, identityId, "personal", now);
    const current = await getBalance(c.env, invId, product.id);
    if (qtyBase > current) throw new AppError("INSUFFICIENT", "No hay suficientes unidades", 422);

    await recordMovement(c.env, {
      inventoryId: invId,
      productId: product.id,
      type: "baja",
      qtyBase,
      declaredUnit: parsed.data.declaredUnit,
      declaredQty: parsed.data.declaredQty,
      reason: parsed.data.reason,
      now,
    });
    return c.json({ productId: product.id, qtyBase: await getBalance(c.env, invId, product.id) });
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /inventory/ledger/global — feed público global de movimientos (Transparencia, feature 4).
// Debe ir ANTES de "/:ref/ledger" para no colisionar con el parámetro.
inventoryRoutes.get("/ledger/global", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 100, 500);
  const movements = await getGlobalLedger(c.env, { limit });
  return c.json({ movements });
});

// GET /inventory/:ref/ledger — libro de movimientos público (US3).
inventoryRoutes.get("/:ref/ledger", async (c) => {
  const ref = c.req.param("ref");
  const limit = Math.min(Number(c.req.query("limit")) || 100, 500);
  const movements = await getLedgerByOwner(c.env, ref, {
    productId: c.req.query("product") || undefined,
    limit,
  });
  return c.json({ owner: { publicName: await getPublicName(c.env, ref) }, movements });
});

// GET /inventory/:ref — inventario público (saldos) (US2/US3).
inventoryRoutes.get("/:ref", async (c) => {
  const ref = c.req.param("ref");
  const balances = await getBalancesByOwner(c.env, ref);
  return c.json({ owner: { publicName: await getPublicName(c.env, ref) }, balances });
});
