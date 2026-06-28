import type { NeedStatus } from "../types";

// Máquina de estados de una necesidad (ver data-model.md).
//
//   pendiente ──commit──▶ comprometida ──resolve──▶ entregada (final)
//       ▲                      │
//       └──release / timeout───┘
//   pendiente ──expira 30d──▶ expirada (final)

export const COMMIT_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 h (FR-007)
export const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 días (FR-019)

const TRANSITIONS: Record<NeedStatus, NeedStatus[]> = {
  pendiente: ["comprometida", "expirada"],
  comprometida: ["pendiente", "entregada"],
  entregada: [],
  expirada: [],
};

/** Indica si una transición de estado es válida. */
export function canTransition(from: NeedStatus, to: NeedStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Lanza si la transición no es válida (uso defensivo en servicios). */
export function assertTransition(from: NeedStatus, to: NeedStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Transición inválida: ${from} → ${to}`);
  }
}

/** ¿Un compromiso iniciado en `committedAt` ya venció (12 h sin confirmación)? */
export function isCommitmentExpired(committedAt: number, now: number): boolean {
  return now - committedAt >= COMMIT_TIMEOUT_MS;
}

/** ¿Una necesidad pendiente actualizada en `updatedAt` ya expiró (30 días)? */
export function isNeedExpired(updatedAt: number, now: number): boolean {
  return now - updatedAt >= EXPIRY_MS;
}
