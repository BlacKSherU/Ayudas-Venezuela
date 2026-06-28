import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { Env } from "../types";
import { hmacHex, sha256Hex, timingSafeEqual } from "./crypto";
import { newId } from "./ids";
import { logEvent } from "./audit";
import { sendOtpEmail, smtpConfigured } from "./email";
import { wasenderConfigured, normalizePhone, buildOtpText } from "./wasender";
import { enqueueWhatsApp } from "./whatsapp-queue";
import { AppError } from "./responses";

const OTP_TTL_SEC = 600; // 10 minutos
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30 días
const SESSION_COOKIE = "session";
const DEV_SECRET = "dev-insecure-secret-change-me";

type Channel = "email" | "phone";

interface OtpRecord {
  channel: Channel;
  contactHash: string;
  codeHash: string;
  attempts: number;
}

function secret(env: Env): string {
  return env.SESSION_SECRET ?? DEV_SECRET;
}

function normalizeContact(channel: Channel, contact: string): string {
  const trimmed = contact.trim().toLowerCase();
  return channel === "phone" ? trimmed.replace(/[\s()-]/g, "") : trimmed;
}

/** Genera un código OTP de 6 dígitos. */
function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

/**
 * Solicita un código OTP para un canal/contacto. Almacena en KV el hash del código (no el
 * código en claro) con TTL. En desarrollo devuelve el código para facilitar pruebas.
 */
export async function requestCode(
  env: Env,
  channel: Channel,
  contact: string,
): Promise<{ requestId: string; expiresInSec: number; devCode?: string }> {
  const contactHash = await sha256Hex(`${channel}:${normalizeContact(channel, contact)}`);
  const code = generateCode();
  const codeHash = await sha256Hex(code);
  const requestId = newId();

  const record: OtpRecord = { channel, contactHash, codeHash, attempts: 0 };
  await env.CONFIG.put(`otp:${requestId}`, JSON.stringify(record), {
    expirationTtl: OTP_TTL_SEC,
  });

  await deliverCode(env, channel, contact, code);

  return {
    requestId,
    expiresInSec: OTP_TTL_SEC,
    ...(env.ENVIRONMENT === "development" ? { devCode: code } : {}),
  };
}

/**
 * Entrega el código por el canal correspondiente. Si hay SMTP configurado, envía el correo;
 * en caso contrario solo registra (en desarrollo el código viaja como devCode en la API).
 */
async function deliverCode(env: Env, channel: Channel, contact: string, code: string): Promise<void> {
  if (channel === "email" && smtpConfigured(env)) {
    try {
      await sendOtpEmail(env, contact, code);
      return;
    } catch (err) {
      logEvent("otp.email_error", { message: String(err) });
      throw new AppError("EMAIL_FAILED", "No se pudo enviar el código por correo", 502);
    }
  }
  if (channel === "phone" && wasenderConfigured(env)) {
    // Encola en la cola con rate-limit y retorna de inmediato: la petición del usuario nunca
    // falla por límites de WaSender; el envío real se drena de forma espaciada.
    await enqueueWhatsApp(env, normalizePhone(contact), buildOtpText(code));
    return;
  }
  // Sin proveedor configurado: registramos el envío sin exponer el contacto.
  logEvent("otp.delivered", { channel, dev: env.ENVIRONMENT === "development" ? code : undefined });
}

/**
 * Verifica el OTP. Si es correcto, busca o crea la identidad ligera y devuelve su id más un
 * token de sesión firmado. Borra el OTP tras un intento exitoso.
 */
export async function verifyCode(
  env: Env,
  requestId: string,
  code: string,
): Promise<{ identityId: string; sessionToken: string } | null> {
  const key = `otp:${requestId}`;
  const raw = await env.CONFIG.get(key);
  if (!raw) return null;

  const record = JSON.parse(raw) as OtpRecord;
  const codeHash = await sha256Hex(code);
  if (!timingSafeEqual(codeHash, record.codeHash)) {
    record.attempts += 1;
    if (record.attempts >= 5) {
      await env.CONFIG.delete(key);
    } else {
      await env.CONFIG.put(key, JSON.stringify(record), { expirationTtl: OTP_TTL_SEC });
    }
    return null;
  }

  await env.CONFIG.delete(key);
  const identityId = await findOrCreateIdentity(env, record.channel, record.contactHash);
  const sessionToken = await createSessionToken(env, identityId);
  return { identityId, sessionToken };
}

async function findOrCreateIdentity(
  env: Env,
  channel: Channel,
  contactHash: string,
): Promise<string> {
  const now = Date.now();
  const existing = await env.DB.prepare(
    `SELECT id FROM identity WHERE channel = ? AND contact_hash = ?`,
  )
    .bind(channel, contactHash)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(`UPDATE identity SET last_seen_at = ? WHERE id = ?`)
      .bind(now, existing.id)
      .run();
    return existing.id;
  }

  const id = newId();
  await env.DB.prepare(
    `INSERT INTO identity (id, channel, contact_hash, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, channel, contactHash, now, now)
    .run();
  return id;
}

async function createSessionToken(env: Env, identityId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${identityId}.${exp}`;
  const sig = await hmacHex(secret(env), payload);
  return `${payload}.${sig}`;
}

/** Valida un token de sesión y devuelve el identityId, o null si es inválido/expirado. */
export async function verifySessionToken(env: Env, token: string): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [identityId, expStr, sig] = parts as [string, string, string];
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const expected = await hmacHex(secret(env), `${identityId}.${expStr}`);
  if (!timingSafeEqual(sig, expected)) return null;
  return identityId;
}

/** Lee la sesión desde la cookie de la petición. */
export async function getSessionIdentity(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  return verifySessionToken(c.env, token);
}

/**
 * Fija la cookie de sesión. En producción usa SameSite=None + Secure + **Partitioned** (CHIPS)
 * para que funcione cuando el frontend (p. ej. unionvzla.com) y la API (workers.dev) están en
 * dominios distintos, sin que el navegador la rechace como cookie de terceros.
 */
export function setSessionCookie(c: Context<{ Bindings: Env }>, token: string): void {
  const prod = c.env.ENVIRONMENT !== "development";
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "None" : "Lax",
    partitioned: prod,
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

/** Borra la cookie de sesión. */
export function clearSessionCookie(c: Context<{ Bindings: Env }>): void {
  const prod = c.env.ENVIRONMENT !== "development";
  setCookie(c, SESSION_COOKIE, "", {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? "None" : "Lax",
    partitioned: prod,
    path: "/",
    maxAge: 0,
  });
}
