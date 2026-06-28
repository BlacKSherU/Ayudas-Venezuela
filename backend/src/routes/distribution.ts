import { Hono } from "hono";
import type { Env } from "../types";

export const distributionRoutes = new Hono<{ Bindings: Env }>();

// GET /distribution — vista agregada pública: oferta (saldos) vs demanda (necesidades) por
// producto, y ranking de zonas con mayor demanda no cubierta (US6, FR-018/019).
distributionRoutes.get("/", async (c) => {
  // Oferta por producto = suma de saldos disponibles.
  const supply = await c.env.DB.prepare(
    `SELECT p.id, p.name, p.base_unit, COALESCE(SUM(pb.qty_base), 0) AS supply
     FROM product p
     LEFT JOIN product_balance pb ON pb.product_id = p.id
     GROUP BY p.id
     ORDER BY supply DESC
     LIMIT 100`,
  ).all<{ id: string; name: string; base_unit: string; supply: number }>();

  // Demanda por producto = nº de solicitudes pendientes que lo piden.
  const demand = await c.env.DB.prepare(
    `SELECT ni.product_id AS id, COUNT(*) AS demand
     FROM need_item ni JOIN need n ON n.id = ni.need_id
     WHERE n.status = 'pendiente' AND ni.product_id IS NOT NULL
     GROUP BY ni.product_id`,
  ).all<{ id: string; demand: number }>();
  const demandById = new Map(demand.results.map((d) => [d.id, d.demand]));

  const byProduct = supply.results.map((s) => ({
    product: { id: s.id, name: s.name, baseUnit: s.base_unit },
    supplyBase: s.supply,
    demandCount: demandById.get(s.id) ?? 0,
  }));

  // A dónde distribuir = zonas con mayor demanda pendiente (necesidades sin atender).
  const unmet = await c.env.DB.prepare(
    `SELECT region_code, COUNT(*) AS demand
     FROM need WHERE status = 'pendiente'
     GROUP BY region_code ORDER BY demand DESC LIMIT 30`,
  ).all<{ region_code: string; demand: number }>();

  return c.json({
    byProduct,
    unmetByRegion: unmet.results.map((r) => ({ regionCode: r.region_code, demandUnmet: r.demand })),
  });
});
