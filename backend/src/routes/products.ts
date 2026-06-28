import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { checkRateLimit } from "../lib/ratelimit";
import { getOrCreateProduct, listCategories, searchProducts } from "../db/inventory-queries";

export const productsRoutes = new Hono<{ Bindings: Env }>();

// GET /products?search=&category=&limit= — búsqueda del catálogo común (público).
productsRoutes.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 30, 100);
  const products = await searchProducts(c.env, {
    search: c.req.query("search") || undefined,
    category: c.req.query("category") || undefined,
    limit,
  });
  return c.json({ products });
});

// GET /products/categories — categorías de referencia (D1, tras normalización).
productsRoutes.get("/categories", async (c) => {
  return c.json({ categories: await listCategories(c.env) });
});

const createSchema = z.object({
  name: z.string().min(2).max(80),
  categoryCode: z.string(),
  dimension: z.enum(["masa", "volumen", "conteo"]),
  baseUnit: z.string().min(1).max(20),
});

// POST /products — crea o devuelve el producto (dedup normalizado). Requiere sesión.
productsRoutes.post("/", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);
    const ip = c.req.header("CF-Connecting-IP") ?? "0.0.0.0";
    if (!(await checkRateLimit(c.env, `product:${ip}`, 30, 600)))
      throw new AppError("RATE_LIMITED", "Demasiados productos nuevos. Espera un momento.", 429);

    const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);

    const product = await getOrCreateProduct(c.env, {
      ...parsed.data,
      createdBy: identityId,
      now: Date.now(),
    });
    return c.json(product, 201);
  } catch (err) {
    return sendError(c, err);
  }
});
