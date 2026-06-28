import type { Env } from "../types";

// Estimación de llegada: distancia haversine / velocidad media configurable (KV). Suficiente
// para dar previsibilidad sin un servicio de rutas externo (research D6).

const DEFAULT_SPEED_KMH = 25;

/** Distancia en km entre dos coordenadas (haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

async function avgSpeedKmh(env: Env): Promise<number> {
  const stored = await env.CONFIG.get("avg_speed_kmh");
  const v = stored ? Number(stored) : DEFAULT_SPEED_KMH;
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_SPEED_KMH;
}

/** Minutos estimados de viaje entre dos puntos. */
export async function etaMinutes(
  env: Env,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<number> {
  const km = haversineKm(from, to);
  const speed = await avgSpeedKmh(env);
  return Math.max(1, Math.round((km / speed) * 60));
}
