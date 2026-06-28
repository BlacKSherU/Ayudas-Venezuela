import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./types";
import { AppError, sendError } from "./lib/responses";
import { identityRoutes } from "./routes/identity";
import { needsRoutes } from "./routes/needs";
import { loadCategories } from "./domain/categories";
import { regionsForBbox } from "./domain/geo";
import { runExpirySweep } from "./jobs/expiry";

export { MapRoom } from "./do/map-room";

const app = new Hono<{ Bindings: Env }>();

// CORS restringido al origen del frontend (Pages), con credenciales para la cookie de sesión.
app.use("/api/*", (c, next) =>
  cors({
    origin: c.env.ALLOWED_ORIGIN,
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  })(c, next),
);

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

// Rutas de dominio.
app.route("/api/v1/identity", identityRoutes);
app.route("/api/v1/needs", needsRoutes);

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Recurso no encontrado" } }, 404));
app.onError((err, c) => {
  if (err instanceof AppError) return sendError(c, err);
  return sendError(c, err);
});

export default {
  fetch: app.fetch,
  // Barrido de respaldo (Cron): expira necesidades pendientes con 30 días sin actualización.
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    await runExpirySweep(env, Date.now());
  },
};
