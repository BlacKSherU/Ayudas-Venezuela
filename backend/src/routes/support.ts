import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../types";
import { AppError, sendError } from "../lib/responses";
import { getSessionIdentity } from "../lib/auth";
import { isValidRole } from "../domain/roles";
import { encryptText } from "../lib/encryption";
import { createSupport, getSupportByIdentity } from "../db/logistics-queries";

export const supportRoutes = new Hono<{ Bindings: Env }>();

const registerSchema = z.object({
  roleCode: z.string(),
  cedulaNumber: z.string().min(5).max(30),
  cedulaPhotoMediaKey: z.string().min(1),
});

// POST /support/register — alta de personal de apoyo (cédula cifrada, auto-aprobación).
supportRoutes.post("/register", async (c) => {
  try {
    const identityId = await getSessionIdentity(c);
    if (!identityId) throw new AppError("UNAUTHENTICATED", "Inicia sesión", 401);

    const parsed = registerSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Datos inválidos", 400);
    const data = parsed.data;

    if (!(await isValidRole(c.env, data.roleCode)))
      throw new AppError("INVALID_ROLE", "Rol no válido", 400);

    const existing = await getSupportByIdentity(c.env, identityId);
    if (existing) throw new AppError("ALREADY_REGISTERED", "Ya tienes un perfil de apoyo", 409);

    const enc = await encryptText(c.env, data.cedulaNumber.trim());
    const supportId = await createSupport(c.env, {
      identityId,
      roleCode: data.roleCode,
      cedulaEnc: enc.enc,
      cedulaIv: enc.iv,
      cedulaPhotoKey: data.cedulaPhotoMediaKey,
      keyVersion: enc.keyVersion,
      now: Date.now(),
    });
    return c.json({ supportId, status: "activo" }, 201);
  } catch (err) {
    return sendError(c, err);
  }
});

// GET /support/me — perfil propio de apoyo (sin exponer la cédula).
supportRoutes.get("/me", async (c) => {
  const identityId = await getSessionIdentity(c);
  if (!identityId) return c.json({ support: null });
  const s = await getSupportByIdentity(c.env, identityId);
  if (!s) return c.json({ support: null });
  return c.json({
    support: {
      id: s.id,
      roleCode: s.role_code,
      status: s.status,
      ratingAvg: s.rating_avg,
      ratingCount: s.rating_count,
      deliveriesDone: s.deliveries_done,
    },
  });
});
