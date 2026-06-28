import type { Env } from "../types";

// Reputación del personal de apoyo: valoración mutua 1–5 + suspensión automática (FR-028).

export interface ReputationParams {
  suspendBelowAvg: number; // umbral de promedio para suspender
  minRatingsForSuspend: number; // mínimo de valoraciones antes de poder suspender
  maxReports: number; // reportes acumulados que suspenden
}

const DEFAULT_PARAMS: ReputationParams = {
  suspendBelowAvg: 2.5,
  minRatingsForSuspend: 3,
  maxReports: 3,
};

export async function loadReputationParams(env: Env): Promise<ReputationParams> {
  const stored = await env.CONFIG.get<Partial<ReputationParams>>("reputation_params", "json");
  return { ...DEFAULT_PARAMS, ...(stored ?? {}) };
}

/** Calcula el nuevo promedio y conteo al añadir una valoración. */
export function applyRating(
  avg: number,
  count: number,
  score: number,
): { avg: number; count: number } {
  const newCount = count + 1;
  const newAvg = (avg * count + score) / newCount;
  return { avg: Number(newAvg.toFixed(3)), count: newCount };
}

/** Determina si el personal debe quedar suspendido según reputación y reportes. */
export function shouldSuspend(
  params: ReputationParams,
  avg: number,
  count: number,
  reports: number,
): boolean {
  if (reports >= params.maxReports) return true;
  if (count >= params.minRatingsForSuspend && avg < params.suspendBelowAvg) return true;
  return false;
}
