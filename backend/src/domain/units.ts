import type { Env } from "../types";

// Unidades y conversiones (FR-027). Cada producto tiene una dimensión y una unidad base; las
// cantidades declaradas en unidades compatibles se convierten a la unidad base al guardarlas.

export type Dimension = "masa" | "volumen" | "conteo";

export interface UnitFactors {
  base: string;
  units: Record<string, number>; // factor a la unidad base
}

const DEFAULT_FACTORS: Record<Dimension, UnitFactors> = {
  masa: { base: "gramo", units: { gramo: 1, g: 1, kg: 1000, kilogramo: 1000 } },
  volumen: { base: "mililitro", units: { ml: 1, mililitro: 1, l: 1000, litro: 1000 } },
  conteo: { base: "unidad", units: { unidad: 1, docena: 12, caja: 1, par: 2 } },
};

export async function loadUnitFactors(env: Env): Promise<Record<Dimension, UnitFactors>> {
  const stored = await env.CONFIG.get<Record<Dimension, UnitFactors>>("unit_factors", "json");
  return stored ?? DEFAULT_FACTORS;
}

/** Convierte una cantidad declarada a la unidad base de su dimensión. Lanza si la unidad no es compatible. */
export async function convertToBase(
  env: Env,
  dimension: Dimension,
  declaredQty: number,
  declaredUnit: string,
): Promise<number> {
  const factors = await loadUnitFactors(env);
  const dim = factors[dimension];
  const factor = dim?.units[declaredUnit.toLowerCase()];
  if (factor === undefined) {
    throw new Error(`Unidad "${declaredUnit}" no compatible con la dimensión ${dimension}`);
  }
  return declaredQty * factor;
}

/** Unidades disponibles para una dimensión (para la UI). */
export async function unitsForDimension(env: Env, dimension: Dimension): Promise<string[]> {
  const factors = await loadUnitFactors(env);
  return Object.keys(factors[dimension]?.units ?? {});
}
