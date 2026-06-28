import type { Env } from "../types";

/** Encola un mensaje de WhatsApp en la cola global con rate-limit (retorna de inmediato). */
export async function enqueueWhatsApp(env: Env, to: string, text: string): Promise<void> {
  const id = env.WHATSAPP_QUEUE.idFromName("global");
  await env.WHATSAPP_QUEUE.get(id).enqueue(to, text);
}
