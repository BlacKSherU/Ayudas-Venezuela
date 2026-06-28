import type { Env } from "../types";

/**
 * Límite de tasa simple con ventana fija sobre KV (anti-abuso, Principio IV).
 * Devuelve `true` si la acción está permitida, `false` si se excedió el límite.
 *
 * Nota: KV es eventualmente consistente; este límite es una barrera "suficientemente buena"
 * para mitigar abuso sin bloquear el acceso urgente. Para límites estrictos se usaría un
 * Durable Object, pero aquí se prioriza simplicidad y costo mínimo.
 */
export async function checkRateLimit(
  env: Env,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const bucket = Math.floor(Date.now() / 1000 / windowSec);
  const k = `rl:${key}:${bucket}`;
  const current = Number((await env.CONFIG.get(k)) ?? "0");
  if (current >= limit) return false;
  await env.CONFIG.put(k, String(current + 1), { expirationTtl: windowSec * 2 });
  return true;
}
