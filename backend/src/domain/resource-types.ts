import type { Env } from "../types";

export interface ResourceType {
  code: string;
  labelEs: string;
  icon: string;
  kind: "fisico" | "humano";
  transportable: boolean;
}

// Catálogo extensible de tipos de recurso (amplía las categorías de la feature 1 con `kind`).
// Administrable vía KV (`resource_types`) sin redeploy (FR-023, SC-009).
export const DEFAULT_RESOURCE_TYPES: ResourceType[] = [
  { code: "agua", labelEs: "Agua", icon: "💧", kind: "fisico", transportable: true },
  { code: "alimentos", labelEs: "Alimentos", icon: "🍚", kind: "fisico", transportable: true },
  { code: "medicinas", labelEs: "Medicinas", icon: "💊", kind: "fisico", transportable: true },
  { code: "higiene", labelEs: "Higiene", icon: "🧼", kind: "fisico", transportable: true },
  { code: "abrigo", labelEs: "Abrigo y refugio", icon: "🛏️", kind: "fisico", transportable: true },
  { code: "bebes", labelEs: "Bebés (pañales/fórmula)", icon: "🍼", kind: "fisico", transportable: true },
  { code: "herramientas", labelEs: "Herramientas", icon: "🛠️", kind: "fisico", transportable: true },
  { code: "medico", labelEs: "Personal médico", icon: "🩺", kind: "humano", transportable: false },
  { code: "rescatista", labelEs: "Rescatista", icon: "⛑️", kind: "humano", transportable: false },
  { code: "voluntario", labelEs: "Voluntario", icon: "🙋", kind: "humano", transportable: false },
];

export async function loadResourceTypes(env: Env): Promise<ResourceType[]> {
  const stored = await env.CONFIG.get<ResourceType[]>("resource_types", "json");
  return stored ?? DEFAULT_RESOURCE_TYPES;
}

export async function getResourceType(env: Env, code: string): Promise<ResourceType | undefined> {
  return (await loadResourceTypes(env)).find((r) => r.code === code);
}

export async function isValidResourceType(env: Env, code: string): Promise<boolean> {
  return (await loadResourceTypes(env)).some((r) => r.code === code);
}
