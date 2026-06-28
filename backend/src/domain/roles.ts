import type { Env } from "../types";

export interface SupportRole {
  code: string;
  labelEs: string;
  requiresCedula: boolean;
}

// Catálogo por defecto (semilla). Administrable vía KV (`support_roles`) sin redeploy.
export const DEFAULT_SUPPORT_ROLES: SupportRole[] = [
  { code: "repartidor", labelEs: "Repartidor", requiresCedula: true },
  { code: "transportista", labelEs: "Transportista", requiresCedula: true },
];

export async function loadSupportRoles(env: Env): Promise<SupportRole[]> {
  const stored = await env.CONFIG.get<SupportRole[]>("support_roles", "json");
  return stored ?? DEFAULT_SUPPORT_ROLES;
}

export async function isValidRole(env: Env, code: string): Promise<boolean> {
  return (await loadSupportRoles(env)).some((r) => r.code === code);
}
