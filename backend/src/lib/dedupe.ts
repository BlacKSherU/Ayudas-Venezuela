import type { Env } from "../types";

/**
 * Detección de duplicados: evita que la misma persona vuelva a publicar una necesidad casi
 * idéntica (misma zona + categoría) en una ventana corta. No bloquea necesidades legítimas
 * distintas; solo mitiga el spam de repetición (FR-008).
 *
 * Devuelve `true` si se considera duplicado reciente.
 */
export async function isRecentDuplicate(
  env: Env,
  ownerIdentityId: string,
  zoneLat: number,
  zoneLng: number,
  categoryCodes: string[],
  windowSec = 3600,
): Promise<boolean> {
  const signature = [
    ownerIdentityId,
    zoneLat.toFixed(2),
    zoneLng.toFixed(2),
    [...categoryCodes].sort().join(","),
  ].join("|");
  const k = `dedupe:${await shortHash(signature)}`;
  const seen = await env.CONFIG.get(k);
  if (seen) return true;
  await env.CONFIG.put(k, "1", { expirationTtl: windowSec });
  return false;
}

async function shortHash(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest).slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
