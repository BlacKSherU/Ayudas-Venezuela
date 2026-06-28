import type { Env } from "../types";
import { logEvent } from "./audit";

// Notificaciones push con OneSignal (REST API). Targeting por external_id (usuarios
// concretos) o por tag (segmentos como "donantes"/"transportistas").
// POST https://api.onesignal.com/notifications, Authorization: Key <REST_API_KEY>.

const ONESIGNAL_URL = "https://api.onesignal.com/notifications";

export interface PushMessage {
  title: string;
  body: string;
  url?: string;
}

export function pushConfigured(env: Env): boolean {
  return Boolean(env.ONESIGNAL_APP_ID && env.ONESIGNAL_API_KEY);
}

async function send(env: Env, target: Record<string, unknown>, msg: PushMessage): Promise<void> {
  if (!pushConfigured(env)) {
    logEvent("push.skipped", {});
    return;
  }
  try {
    const res = await fetch(ONESIGNAL_URL, {
      method: "POST",
      headers: {
        Authorization: `Key ${env.ONESIGNAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_id: env.ONESIGNAL_APP_ID,
        headings: { en: msg.title, es: msg.title },
        contents: { en: msg.body, es: msg.body },
        ...(msg.url ? { url: msg.url } : {}),
        ...target,
      }),
    });
    if (!res.ok) logEvent("push.error", { status: res.status });
  } catch (err) {
    logEvent("push.error", { message: String(err) });
  }
}

/** Envía push a usuarios concretos por su external_id (= identidad ligera). */
export async function pushToIdentities(
  env: Env,
  identityIds: string[],
  msg: PushMessage,
): Promise<void> {
  const ids = identityIds.filter(Boolean);
  if (ids.length === 0) return;
  await send(env, { include_aliases: { external_id: ids }, target_channel: "push" }, msg);
}

/** Envía push a un segmento por tag (p. ej. role_donor=true, role_transportista=true). */
export async function pushToTag(
  env: Env,
  key: string,
  value: string,
  msg: PushMessage,
): Promise<void> {
  await send(env, { filters: [{ field: "tag", key, relation: "=", value }] }, msg);
}
