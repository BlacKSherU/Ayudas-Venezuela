import { Hono } from "hono";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { getMediaMeta, putMedia, validateMedia, type MediaKind } from "../lib/r2";
import { decryptEnvelope, encryptEnvelope } from "../lib/encryption";

export const mediaRoutes = new Hono<{ Bindings: Env }>();

const KINDS: MediaKind[] = ["cedula", "evidencia", "prueba_entrega"];

// POST /media — sube un medio a R2 (cifrado si es cédula). Requiere sesión.
mediaRoutes.post("/", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);

    const kind = (c.req.query("kind") ?? "") as MediaKind;
    if (!KINDS.includes(kind)) throw new AppError("VALIDATION_ERROR", "kind inválido", 400);

    const contentType = c.req.header("Content-Type") ?? "application/octet-stream";
    const body = new Uint8Array(await c.req.arrayBuffer());
    validateMedia(contentType, body.byteLength);

    const now = Date.now();
    const encrypted = kind === "cedula";
    const stored = encrypted ? await encryptEnvelope(c.env, body) : body;
    const key = await putMedia(c.env, {
      kind,
      contentType,
      body: stored,
      ownerRef: identityId,
      encrypted,
      now,
    });
    return c.json({ key, contentType, size: body.byteLength }, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /media/:key — descarga controlada. La cédula no se sirve salvo flujo de auditoría.
mediaRoutes.get("/:key{.+}", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);

    const key = c.req.param("key");
    const meta = await getMediaMeta(c.env, key);
    if (!meta) throw new AppError("NOT_FOUND", "Medio no encontrado", 404);

    // MVP: la cédula nunca se sirve por esta vía (solo auditoría, fuera de alcance del MVP).
    if (meta.kind === "cedula") throw new AppError("FORBIDDEN", "Acceso restringido", 403);

    // Acceso a evidencias/prueba: el dueño (reportante) puede verlas. La autorización por
    // pertenencia a la orden se refina con el flujo de incidencias (US6).
    if (meta.owner_ref && meta.owner_ref !== identityId) {
      throw new AppError("FORBIDDEN", "No autorizado", 403);
    }

    const obj = await c.env.MEDIA.get(key);
    if (!obj) throw new AppError("NOT_FOUND", "Medio no encontrado", 404);
    const raw = new Uint8Array(await obj.arrayBuffer());
    const bytes = meta.encrypted ? await decryptEnvelope(c.env, raw) : raw;
    return new Response(bytes as unknown as BodyInit, {
      headers: { "Content-Type": meta.content_type },
    });
  } catch (err) {
    return sendError(c, err);
  }
});
