import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types";
import { sendWhatsAppText } from "../lib/wasender";
import { logEvent } from "../lib/audit";

// Cola de mensajes WhatsApp con rate-limit (un mensaje por intervalo) para respetar los
// límites del plan gratis de WaSender. Las peticiones de OTP encolan y retornan de inmediato;
// el envío real lo drena este Durable Object mediante alarmas espaciadas. Así, registrarse o
// iniciar sesión nunca falla por rate limit.

const DEFAULT_INTERVAL_MS = 1500; // ~40 mensajes/min
const MAX_ATTEMPTS = 3;

interface QueuedMsg {
  to: string;
  text: string;
  attempts: number;
}

export class WhatsAppQueue extends DurableObject<Env> {
  private intervalMs(): number {
    const v = Number(this.env.WASENDER_INTERVAL_MS ?? "");
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_INTERVAL_MS;
  }

  /** Encola un mensaje (RPC, rápido). Programa el drenado si no hay alarma activa. */
  async enqueue(to: string, text: string): Promise<void> {
    const seq = ((await this.ctx.storage.get<number>("seq")) ?? 0) + 1;
    await this.ctx.storage.put("seq", seq);
    const key = `msg:${String(seq).padStart(12, "0")}`;
    await this.ctx.storage.put<QueuedMsg>(key, { to, text, attempts: 0 });
    if ((await this.ctx.storage.getAlarm()) === null) {
      await this.ctx.storage.setAlarm(Date.now() + 50);
    }
  }

  /** Drena un mensaje por alarma, reprogramando con el intervalo (rate limit). */
  async alarm(): Promise<void> {
    const batch = await this.ctx.storage.list<QueuedMsg>({ prefix: "msg:", limit: 1 });
    let processedKey: string | null = null;
    for (const [key, msg] of batch) {
      processedKey = key;
      try {
        await sendWhatsAppText(this.env, msg.to, msg.text);
        await this.ctx.storage.delete(key);
      } catch {
        const attempts = msg.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          await this.ctx.storage.delete(key);
          logEvent("whatsapp.dropped", { attempts });
        } else {
          await this.ctx.storage.put<QueuedMsg>(key, { ...msg, attempts });
        }
      }
      break;
    }
    if (processedKey === null) return; // cola vacía
    const remaining = await this.ctx.storage.list<QueuedMsg>({ prefix: "msg:", limit: 1 });
    if (remaining.size > 0) await this.ctx.storage.setAlarm(Date.now() + this.intervalMs());
  }
}
