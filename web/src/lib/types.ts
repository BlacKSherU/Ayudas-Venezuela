export type NeedStatus = "pendiente" | "comprometida" | "entregada" | "expirada";
export type Urgency = "alta" | "media" | "baja";

export interface NeedItem {
  categoryCode: string;
  quantity: string | null;
}

export interface Need {
  id: string;
  status: NeedStatus;
  urgency: Urgency;
  zone: { lat: number; lng: number };
  regionCode: string;
  items: NeedItem[];
  note: string | null;
  contactPublic: string | null;
  updatedAt: number;
}

export interface Category {
  code: string;
  labelEs: string;
  icon: string;
}

export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Centro de acopio (feature 4): punto público con ubicación EXACTA. */
export interface Center {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  regionCode: string;
  note: string | null;
}

/** Centro propio del usuario, con estado de moderación (anti-abuso). */
export interface MyCenter extends Center {
  status: "activo" | "oculto";
  reportsCount: number;
}

export type RealtimeEvent =
  | { type: "hello"; serverTime: number }
  | { type: "need.created"; need: Need }
  | { type: "need.updated"; need: Need }
  | { type: "need.closed"; id: string; reason: string }
  | { type: "center.created"; center: Center }
  | { type: "center.removed"; id: string }
  | { type: "pong"; t: number };

export type OrderStatus =
  | "disponible"
  | "tomada"
  | "recogida"
  | "en_camino"
  | "entregada"
  | "con_incidencia"
  | "liberada"
  | "cancelada";

export interface Order {
  id: string;
  needId: string;
  status: OrderStatus;
  pickupZone: { lat: number; lng: number };
  regionCode: string;
  items: NeedItem[];
  donorContact: string | null;
  donationEvidence: string | null;
  pickupEvidence: string | null;
  deliveryEvidence: string | null;
  etaMs: number | null;
  updatedAt: number;
}

export interface SupportProfile {
  id: string;
  roleCode: string;
  status: "activo" | "suspendido";
  ratingAvg: number;
  ratingCount: number;
  deliveriesDone: number;
}

export interface SupportRole {
  code: string;
  labelEs: string;
  requiresCedula: boolean;
}

export interface Product {
  id: string;
  name: string;
  categoryCode: string;
  dimension: "masa" | "volumen" | "conteo";
  baseUnit: string;
}

export interface InventoryBalance {
  product: { id: string; name: string; baseUnit: string; categoryCode: string };
  kind: string;
  qtyBase: number;
}

export interface LedgerMovement {
  id: string;
  type: string;
  direction: "in" | "out";
  qtyBase: number;
  declaredUnit: string;
  declaredQty: number;
  reason: string | null;
  orderId: string | null;
  at: number;
  product: { name: string };
  counterparty: { publicName: string; ref: string } | null;
}

/** Movimiento del feed público global (Transparencia): incluye el dueño del inventario. */
export interface GlobalMovement extends LedgerMovement {
  owner: { publicName: string; ref: string };
}

export const UNITS_BY_DIMENSION: Record<string, string[]> = {
  masa: ["gramo", "kg"],
  volumen: ["mililitro", "litro"],
  conteo: ["unidad", "docena"],
};
