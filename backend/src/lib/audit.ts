import type { Env, NeedStatus } from "../types";
import { newId } from "./ids";

export type AuditAction =
  | "created"
  | "committed"
  | "released"
  | "delivered"
  | "expired"
  | "edited"
  | "reported";

/**
 * Registra un cambio de estado de forma auditable, SIN datos personales (FR-014).
 * `actorRef` debe ser una referencia no identificable (p. ej. hash de identidad).
 */
export async function recordAudit(
  env: Env,
  params: {
    needId: string;
    action: AuditAction;
    fromStatus?: NeedStatus | null;
    toStatus?: NeedStatus | null;
    actorRef?: string | null;
    now: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO audit_event (id, need_id, action, from_status, to_status, actor_ref, at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      newId(),
      params.needId,
      params.action,
      params.fromStatus ?? null,
      params.toStatus ?? null,
      params.actorRef ?? null,
      params.now,
    )
    .run();
}

/** Log estructurado en JSON (sin datos personales). */
export function logEvent(event: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, ...fields }));
}
