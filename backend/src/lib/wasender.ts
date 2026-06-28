import type { Env } from "../types";
import { logEvent } from "./audit";

// Envío de WhatsApp con WaSender (https://wasenderapi.com/api-docs).
// POST /api/send-message, Authorization: Bearer <token>, body { to, text }.
// El envío real se hace desde una COLA con rate-limit (WhatsAppQueue DO) para respetar los
// límites del plan gratis y que los registros/inicios de sesión nunca fallen por rate limit.

const WASENDER_URL = "https://wasenderapi.com/api/send-message";

export function wasenderConfigured(env: Env): boolean {
  return Boolean(env.WASENDER_API_KEY);
}

/** Normaliza el teléfono a formato internacional (Venezuela +58 por defecto). */
export function normalizePhone(raw: string): string {
  const p = raw.trim().replace(/[\s()-]/g, "");
  if (p.startsWith("+")) return p;
  if (p.startsWith("58")) return `+${p}`;
  if (p.startsWith("0")) return `+58${p.slice(1)}`; // 0414... → +58414...
  return `+58${p}`;
}

/** Texto del mensaje OTP por WhatsApp. */
export function buildOtpText(code: string): string {
  return (
    `Ayuda Venezuela: tu código de verificación es ${code}. ` +
    `Vence en 10 minutos. Si no lo solicitaste, ignora este mensaje.`
  );
}

/** Envío de bajo nivel de un texto por WhatsApp. Lanza si la API responde con error. */
export async function sendWhatsAppText(env: Env, to: string, text: string): Promise<void> {
  const res = await fetch(WASENDER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WASENDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, text }),
  });
  if (!res.ok) {
    logEvent("whatsapp.send_error", { status: res.status });
    throw new Error(`WaSender ${res.status}`);
  }
  logEvent("whatsapp.sent", {});
}
