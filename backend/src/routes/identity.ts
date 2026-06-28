import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { checkRateLimit } from "../lib/ratelimit";
import {
  clearSessionCookie,
  getSessionIdentity,
  requestCode,
  setSessionCookie,
  verifyCode,
} from "../lib/auth";

export const identityRoutes = new Hono<{ Bindings: Env }>();

const requestSchema = z.object({
  channel: z.enum(["email", "phone"]),
  contact: z.string().min(3).max(254),
});

const verifySchema = z.object({
  requestId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

function clientIp(req: Request): string {
  return req.headers.get("CF-Connecting-IP") ?? "0.0.0.0";
}

// POST /identity/request-code — solicita un código OTP (público, con límite de tasa).
identityRoutes.post("/request-code", async (c) => {
  try {
    const parsed = requestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);

    const ip = clientIp(c.req.raw);
    const allowed = await checkRateLimit(c.env, `otp:${ip}`, 5, 600);
    if (!allowed) throw new AppError("RATE_LIMITED", "Demasiados intentos. Espera un momento.", 429);

    const result = await requestCode(c.env, parsed.data.channel, parsed.data.contact);
    return c.json(result, 202);
  } catch (err) {
    return sendError(c, err);
  }
});

// POST /identity/verify — verifica el OTP y abre sesión.
identityRoutes.post("/verify", async (c) => {
  try {
    const parsed = verifySchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);

    const result = await verifyCode(c.env, parsed.data.requestId, parsed.data.code);
    if (!result) throw new AppError("INVALID_CODE", "Código incorrecto o vencido", 401);

    setSessionCookie(c, result.sessionToken);
    return c.json({ identityId: result.identityId });
  } catch (err) {
    return sendError(c, err);
  }
});

// POST /identity/logout — cierra la sesión.
identityRoutes.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.body(null, 204);
});

// GET /identity/me — devuelve la identidad de la sesión (o null).
identityRoutes.get("/me", async (c) => {
  const identityId = await getSessionIdentity(c);
  return c.json({ identityId });
});
