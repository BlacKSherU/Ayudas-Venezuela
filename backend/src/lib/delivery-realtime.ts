import type { DeliveryEvent, Env } from "../types";

/** Difunde un evento de tiempo real a la sala (DeliveryRoom) de una orden. */
export async function broadcastToOrder(
  env: Env,
  orderId: string,
  event: DeliveryEvent,
): Promise<void> {
  try {
    const id = env.DELIVERY_ROOM.idFromName(orderId);
    await env.DELIVERY_ROOM.get(id).broadcast(event);
  } catch {
    // Best-effort: el cliente reconcilia con GET /orders/:id al reconectar.
  }
}
