import type { OrderStatus } from "./types";

// Etiquetas de estado de una orden (feature 4). "Reservada" en vez de "aceptada": la orden se
// reserva al tomarla, pero solo se confirma al verificar el código de recogida.
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  disponible: "Disponible",
  tomada: "Reservada",
  recogida: "Recogida (confirmada)",
  en_camino: "En camino",
  entregada: "Entregada",
  con_incidencia: "Con incidencia",
  liberada: "Liberada",
  cancelada: "Cancelada",
};

export function orderStatusLabel(s: OrderStatus | string): string {
  return ORDER_STATUS_LABEL[s as OrderStatus] ?? s;
}
