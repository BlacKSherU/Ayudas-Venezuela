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

export type RealtimeEvent =
  | { type: "hello"; serverTime: number }
  | { type: "need.created"; need: Need }
  | { type: "need.updated"; need: Need }
  | { type: "need.closed"; id: string; reason: string }
  | { type: "pong"; t: number };
