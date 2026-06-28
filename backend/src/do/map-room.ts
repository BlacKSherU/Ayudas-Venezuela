import { DurableObject } from "cloudflare:workers";
import type { Env, NeedPublic, RealtimeEvent } from "../types";

interface Subscription {
  bbox: [number, number, number, number] | null; // [minLng, minLat, maxLng, maxLat]
  filters: { status?: string; category?: string; urgency?: string };
}

/**
 * MapRoom: un Durable Object por región (estado de Venezuela). Mantiene las conexiones
 * WebSocket de quienes observan el mapa de esa región y les difunde eventos en tiempo real.
 *
 * Usa la WebSocket Hibernation API: las conexiones inactivas no consumen cómputo, lo que
 * permite escalar a muchas conexiones concurrentes (SC-007) a costo mínimo.
 */
export class MapRoom extends DurableObject<Env> {
  /** Maneja el upgrade a WebSocket reenviado por el Worker. */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Se esperaba una conexión WebSocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Acepta la conexión con hibernación habilitada.
    this.ctx.acceptWebSocket(server);
    const initial: Subscription = { bbox: null, filters: {} };
    server.serializeAttachment(initial);

    server.send(JSON.stringify({ type: "hello", serverTime: Date.now() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  /** Mensajes del cliente: `subscribe` (ajusta viewport/filtros) y `ping`. */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    let msg: { type?: string; bbox?: [number, number, number, number]; filters?: Subscription["filters"]; t?: number };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }

    if (msg.type === "subscribe") {
      const sub: Subscription = { bbox: msg.bbox ?? null, filters: msg.filters ?? {} };
      ws.serializeAttachment(sub);
    } else if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t: msg.t ?? Date.now() }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, "cerrado");
    } catch {
      // ya cerrado
    }
  }

  async webSocketError(): Promise<void> {
    // Las conexiones con error se descartan automáticamente.
  }

  /**
   * Difunde un evento a las conexiones cuyo viewport y filtros coinciden (RPC desde el Worker).
   * Para `need.closed` se difunde a toda la región (no se conoce la zona del evento).
   */
  async broadcast(event: RealtimeEvent): Promise<void> {
    const payload = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      const sub = (ws.deserializeAttachment() as Subscription | null) ?? { bbox: null, filters: {} };
      const broad =
        event.type === "need.closed" ||
        event.type === "center.created" ||
        event.type === "center.removed";
      if (broad || this.matches(event.need, sub)) {
        try {
          ws.send(payload);
        } catch {
          // conexión caída; se limpiará en webSocketClose
        }
      }
    }
  }

  private matches(need: NeedPublic, sub: Subscription): boolean {
    const { bbox, filters } = sub;
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const { lat, lng } = need.zone;
      if (lat < minLat || lat > maxLat || lng < minLng || lng > maxLng) return false;
    }
    if (filters.status && need.status !== filters.status) return false;
    if (filters.urgency && need.urgency !== filters.urgency) return false;
    if (filters.category && !need.items.some((i) => i.categoryCode === filters.category)) return false;
    return true;
  }
}
