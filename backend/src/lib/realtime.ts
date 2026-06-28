import type { Env, RealtimeEvent } from "../types";

// MVP: una sola sala de tiempo real a nivel nacional. El filtrado por viewport/filtros lo
// hace el propio MapRoom, así que la difusión es correcta y eficiente para el MVP. El
// sharding por región (un DO por estado) es una optimización futura para escala (plan D2);
// se conserva la firma `regionCode` para habilitarlo sin tocar las rutas.
const NATIONAL_ROOM = "VE";

function room(env: Env) {
  return env.MAP_ROOM.get(env.MAP_ROOM.idFromName(NATIONAL_ROOM));
}

/** Difunde un evento de tiempo real a las conexiones (vía RPC del Durable Object). */
export async function broadcastToRegion(
  env: Env,
  _regionCode: string,
  event: RealtimeEvent,
): Promise<void> {
  try {
    await room(env).broadcast(event);
  } catch {
    // Best-effort: el cliente reconcilia con el snapshot REST al reconectar.
  }
}
