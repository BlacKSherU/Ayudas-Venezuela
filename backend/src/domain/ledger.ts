// Reglas del libro de movimientos de inventario (append-only). Cada tipo de movimiento tiene
// una dirección (in/out) que define su efecto sobre el saldo.

export type MovementType =
  | "alta"
  | "salida_recogida"
  | "entrada_recogida"
  | "salida_entrega"
  | "entrada_entrega"
  | "entrega_directa_salida"
  | "entrada_directa"
  | "baja";

export type Direction = "in" | "out";

export const DIRECTION: Record<MovementType, Direction> = {
  alta: "in",
  entrada_recogida: "in",
  entrada_entrega: "in",
  entrada_directa: "in",
  salida_recogida: "out",
  salida_entrega: "out",
  entrega_directa_salida: "out",
  baja: "out",
};

export type DecreaseReason = "consumido" | "roto" | "extraviado" | "estropeado";
export const DECREASE_REASONS: DecreaseReason[] = ["consumido", "roto", "extraviado", "estropeado"];

/** Efecto sobre el saldo (positivo entra, negativo sale). */
export function balanceDelta(type: MovementType, qtyBase: number): number {
  return DIRECTION[type] === "in" ? qtyBase : -qtyBase;
}
