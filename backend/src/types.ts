import type { MapRoom } from "./do/map-room";
import type { DeliveryRoom } from "./do/delivery-room";
import type { WhatsAppQueue } from "./do/whatsapp-queue";

/** Bindings del Worker (D1, KV, R2, Durable Objects, vars y secrets). */
export interface Env {
  DB: D1Database;
  CONFIG: KVNamespace;
  MEDIA: R2Bucket;
  MAP_ROOM: DurableObjectNamespace<MapRoom>;
  DELIVERY_ROOM: DurableObjectNamespace<DeliveryRoom>;
  WHATSAPP_QUEUE: DurableObjectNamespace<WhatsAppQueue>;
  ENVIRONMENT: string;
  ALLOWED_ORIGIN: string;
  EMAIL_FROM: string;
  /** Clave maestra AES-GCM (base64, 32 bytes) para cifrar cédula y ubicación exacta. */
  ENCRYPTION_KEY?: string;
  /** Secreto para firmar cookies de sesión. Definir con `wrangler secret put SESSION_SECRET`. */
  SESSION_SECRET?: string;
  /** Configuración SMTP para enviar el OTP por correo (definir como secrets). */
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  /** Tipo de autenticación SMTP: "login" (def.) | "plain" | "cram-md5". */
  SMTP_AUTH?: string;
  /** WaSender (WhatsApp) para enviar el OTP por teléfono. Token como secret. */
  WASENDER_API_KEY?: string;
  /** Intervalo (ms) entre envíos de la cola WhatsApp (rate limit). Por defecto 1500. */
  WASENDER_INTERVAL_MS?: string;
  /** OneSignal: App ID (público, var) y REST API Key (secret) para enviar push. */
  ONESIGNAL_APP_ID?: string;
  ONESIGNAL_API_KEY?: string;
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

/** Vista pública de un centro de acopio (feature 4). Ubicación EXACTA: es un punto público. */
export interface CenterPublic {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  regionCode: string;
  note: string | null;
}

/** Eventos de tiempo real difundidos por el Durable Object MapRoom. */
export type RealtimeEvent =
  | { type: "need.created"; need: NeedPublic }
  | { type: "need.updated"; need: NeedPublic }
  | { type: "need.closed"; id: string; reason: string }
  | { type: "center.created"; center: CenterPublic }
  | { type: "center.removed"; id: string };

export type OrderStatus =
  | "disponible"
  | "tomada"
  | "recogida"
  | "en_camino"
  | "entregada"
  | "con_incidencia"
  | "liberada"
  | "cancelada";

/** Vista pública/listable de una orden de entrega. La ubicación de recogida es exacta (v2.0.0). */
export interface OrderPublic {
  id: string;
  needId: string;
  status: OrderStatus;
  pickupZone: { lat: number; lng: number };
  regionCode: string;
  items: { categoryCode: string; quantity: string | null }[];
  donorContact: string | null;
  etaMs: number | null;
  updatedAt: number;
}

/** Eventos de tiempo real de una entrega (Durable Object DeliveryRoom). */
export type DeliveryEvent =
  | { type: "order.status"; status: OrderStatus; at: number }
  | { type: "position.update"; lat: number; lng: number; etaMinutes: number | null; t: number }
  | { type: "incident"; incidentType: string; at: number };
