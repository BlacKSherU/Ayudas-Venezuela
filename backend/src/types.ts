import type { MapRoom } from "./do/map-room";

/** Bindings del Worker (D1, KV, Durable Object, vars y secrets). */
export interface Env {
  DB: D1Database;
  CONFIG: KVNamespace;
  MAP_ROOM: DurableObjectNamespace<MapRoom>;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN: string;
  EMAIL_FROM: string;
  /** Secreto para firmar cookies de sesión. Definir con `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET?: string;
  /** Configuración SMTP para enviar el OTP (definir como secrets). */
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  /** Tipo de autenticación SMTP: "login" (def.) | "plain" | "cram-md5". */
  SMTP_AUTH?: string;
}

export type NeedStatus = "pendiente" | "comprometida" | "entregada" | "expirada";
export type Urgency = "alta" | "media" | "baja";

/** Vista pública de una necesidad (datos ofuscados, sin identificadores personales). */
export interface NeedPublic {
  id: string;
  status: NeedStatus;
  urgency: Urgency;
  zone: { lat: number; lng: number };
  regionCode: string;
  items: { categoryCode: string; quantity: string | null }[];
  note: string | null;
  contactPublic: string | null;
  updatedAt: number;
}

/** Eventos de tiempo real difundidos por el Durable Object MapRoom. */
export type RealtimeEvent =
  | { type: "need.created"; need: NeedPublic }
  | { type: "need.updated"; need: NeedPublic }
  | { type: "need.closed"; id: string; reason: string };
