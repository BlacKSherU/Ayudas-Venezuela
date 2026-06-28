import type { OrderStatus } from "../types";

// Máquina de estados de una orden de entrega (ver data-model.md).
export const ORDER_TAKE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 h sin avanzar → auto-liberar

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  disponible: ["tomada", "cancelada"],
  tomada: ["recogida", "liberada", "con_incidencia", "cancelada"],
  // Tras recoger, el transportista puede ir "en camino" o entregar directamente.
  recogida: ["en_camino", "entregada", "con_incidencia"],
  en_camino: ["entregada", "con_incidencia"],
  con_incidencia: ["disponible", "en_camino", "cancelada"],
  entregada: [],
  liberada: [],
  cancelada: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Estados en los que una orden está "en curso" (asignada a un transportista). */
export function isActiveOrder(status: OrderStatus): boolean {
  return status === "tomada" || status === "recogida" || status === "en_camino";
}
