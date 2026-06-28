import type { Env } from "../types";
import { ORDER_TAKE_TIMEOUT_MS } from "../domain/order-state";
import { getNeedOwnerId, releaseOrder } from "../db/logistics-queries";
import { broadcastToOrder } from "../lib/delivery-realtime";
import { pushToIdentities } from "../lib/notifications";

/**
 * Libera órdenes tomadas que no avanzan tras `ORDER_TAKE_TIMEOUT_MS` (FR-010) y notifica a
 * donante y necesitado (push: "el transportista no respondió"). Pensado para el Cron.
 */
export async function runOrderTimeoutSweep(env: Env, now: number): Promise<number> {
  const threshold = now - ORDER_TAKE_TIMEOUT_MS;
  const { results } = await env.DB.prepare(
    `SELECT id, need_id, donor_identity_id FROM delivery_order
     WHERE status = 'tomada' AND taken_at < ? LIMIT 200`,
  )
    .bind(threshold)
    .all<{ id: string; need_id: string; donor_identity_id: string }>();

  for (const o of results) {
    await releaseOrder(env, o.id, now);
    await broadcastToOrder(env, o.id, { type: "order.status", status: "disponible", at: now });
    const needyId = await getNeedOwnerId(env, o.need_id);
    await pushToIdentities(env, [o.donor_identity_id, needyId ?? ""], {
      title: "Entrega sin avance",
      body: "El transportista no respondió a tiempo; la orden volvió a estar disponible.",
      url: env.ALLOWED_ORIGIN,
    });
  }
  return results.length;
}
