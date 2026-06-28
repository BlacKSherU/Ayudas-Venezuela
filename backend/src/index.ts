import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { AppError, sendError } from "./lib/responses";
import { identityRoutes } from "./routes/identity";
import { needsRoutes } from "./routes/needs";
import { loadCategories } from "./domain/categories";
import { regionsForBbox } from "./domain/geo";
import { runExpirySweep } from "./jobs/expiry";
import { runOrderTimeoutSweep } from "./jobs/orders-sweep";
import { supportRoutes } from "./routes/support";
import { mediaRoutes } from "./routes/media";
import { ordersRoutes } from "./routes/orders";
import { loadSupportRoles } from "./domain/roles";
import { loadResourceTypes } from "./domain/resource-types";
import { getSessionIdentity } from "./lib/auth";
import { productsRoutes } from "./routes/products";
import { inventoryRoutes } from "./routes/inventory";
import { deliveriesRoutes } from "./routes/deliveries";
import { distributionRoutes } from "./routes/distribution";
import { centersRoutes } from "./routes/centers";

export { MapRoom } from "./do/map-room";
export { DeliveryRoom } from "./do/delivery-room";
export { WhatsAppQueue } from "./do/whatsapp-queue";

const app = new Hono<{ Bindings: Env }>();

// CORS restringido a los orígenes permitidos (Pages + dominio(s) propio(s)), con credenciales.
// ALLOWED_ORIGIN admite una lista separada por comas.
app.use("/api/*", (c, next) => {
  const allowed = c.env.ALLOWED_ORIGIN.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => (origin && allowed.includes(origin) ? origin : (allowed[0] ?? "")),
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })(c, next);
});

app.get("/api/v1/health", (c) => c.json({ ok: true }));

// Catálogo de tipos de insumo (público).
app.get("/api/v1/categories", async (c) => {
  const categories = await loadCategories(c.env);
  return c.json({ categories });
});

// Tiempo real: upgrade WebSocket reenviado al MapRoom de la región.
app.get("/api/v1/realtime", (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.json({ error: { code: "EXPECTED_WS", message: "Se esperaba WebSocket" } }, 426);
  }
  const region = c.req.query("region") || "VE";
  // Validación ligera del código de región contra el mapa conocido.
  const known = new Set(regionsForBbox(-73.4, 0.6, -59.8, 12.3));
  const target = known.has(region) || region === "VE" ? region : "VE";
  const id = c.env.MAP_ROOM.idFromName(target);
  return c.env.MAP_ROOM.get(id).fetch(c.req.raw);
});

// Catálogos configurables (feature 2): roles de apoyo y tipos de recurso.
app.get("/api/v1/catalog/roles", async (c) => c.json({ roles: await loadSupportRoles(c.env) }));
app.get("/api/v1/catalog/resource-types", async (c) =>
  c.json({ resourceTypes: await loadResourceTypes(c.env) }),
);

// Tiempo real de una entrega: rastreo + estado (DeliveryRoom por orden).
app.get("/api/v1/orders/:id/track", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.json({ error: { code: "EXPECTED_WS", message: "Se esperaba WebSocket" } }, 426);
  }
  // MVP: requiere sesión. La verificación de pertenencia a la orden se refina en US7.
  const identityId = await getSessionIdentity(c);
  if (!identityId) return c.json({ error: { code: "UNAUTHENTICATED", message: "Inicia sesión" } }, 401);
  const orderId = c.req.param("id");
  const id = c.env.DELIVERY_ROOM.idFromName(orderId);
  return c.env.DELIVERY_ROOM.get(id).fetch(c.req.raw);
});

// Rutas de dominio.
app.route("/api/v1/identity", identityRoutes);
app.route("/api/v1/needs", needsRoutes);
app.route("/api/v1/support", supportRoutes);
app.route("/api/v1/media", mediaRoutes);
app.route("/api/v1/orders", ordersRoutes);
app.route("/api/v1/products", productsRoutes);
app.route("/api/v1/inventory", inventoryRoutes);
app.route("/api/v1/deliveries", deliveriesRoutes);
app.route("/api/v1/distribution", distributionRoutes);
app.route("/api/v1/centers", centersRoutes);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado" } }, 404));
app.onError((err, c) => {
  if (err instanceof AppError) return sendError(c, err);
  return sendError(c, err);
});

export default {
  fetch: app.fetch,
  // Barrido de respaldo (Cron): expira necesidades pendientes con 30 días sin actualización.
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const now = Date.now();
    await runExpirySweep(env, now);
    await runOrderTimeoutSweep(env, now);
  },
};
