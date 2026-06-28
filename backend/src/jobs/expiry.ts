import type { Env, NeedStatus } from "../types";
import { EXPIRY_MS } from "../domain/need-state";
import { broadcastToRegion } from "../lib/realtime";
import { recordAudit } from "../lib/audit";

/**
 * Expira necesidades pendientes con `EXPIRY_MS` (30 días) sin actualización y emite
 * `need.closed` por región. Pensado para ejecutarse desde un Cron Trigger (FR-019).
 */
export async function runExpirySweep(env: Env, now: number): Promise<number> {
  const threshold = now - EXPIRY_MS;
  const { results } = await env.DB.prepare(
    `SELECT id, region_code, status FROM need
     WHERE status = 'pendiente' AND updated_at < ?
     LIMIT 500`,
  )
    .bind(threshold)
    .all<{ id: string; region_code: string; status: NeedStatus }>();

  for (const row of results) {
    await env.DB.prepare(`UPDATE need SET status = 'expirada', updated_at = ? WHERE id = ?`)
      .bind(now, row.id)
      .run();
    await recordAudit(env, {
      needId: row.id,
      action: "expired",
      fromStatus: "pendiente",
      toStatus: "expirada",
      now,
    });
    await broadcastToRegion(env, row.region_code, {
      type: "need.closed",
      id: row.id,
      reason: "expirada",
    });
  }
  return results.length;
}
