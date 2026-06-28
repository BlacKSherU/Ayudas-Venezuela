import type { Env } from "../types";

export interface Category {
  code: string;
  labelEs: string;
  icon: string;
}

// Catálogo por defecto de tipos de insumo. Administrable vía KV (clave `categories`) sin
// migración de esquema; este valor se usa como semilla y respaldo.
export const DEFAULT_CATEGORIES: Category[] = [
  { code: "agua", labelEs: "Agua", icon: "💧" },
  { code: "alimentos", labelEs: "Alimentos", icon: "🍚" },
  { code: "medicinas", labelEs: "Medicinas", icon: "💊" },
  { code: "higiene", labelEs: "Higiene", icon: "🧼" },
  { code: "abrigo", labelEs: "Abrigo y refugio", icon: "🛏️" },
  { code: "bebes", labelEs: "Bebés (pañales/fórmula)", icon: "🍼" },
];

const CODES = new Set(DEFAULT_CATEGORIES.map((c) => c.code));

/** Carga el catálogo desde KV; cae al valor por defecto si no está configurado. */
export async function loadCategories(env: Env): Promise<Category[]> {
  const stored = await env.CONFIG.get<Category[]>("categories", "json");
  return stored ?? DEFAULT_CATEGORIES;
}

/** Valida un código de categoría contra el catálogo por defecto. */
export function isValidCategory(code: string): boolean {
  return CODES.has(code);
}
