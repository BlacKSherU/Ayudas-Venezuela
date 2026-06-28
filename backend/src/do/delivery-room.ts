import { DurableObject } from "cloudflare:workers";
import type { DeliveryEvent, Env } from "../types";

/**
 * DeliveryRoom: un Durable Object por orden de entrega. Mantiene las conexiones WebSocket de
 * las partes (donante, necesitado, transportista) y difunde estado de la orden, posición en
 * vivo e incidencias. La información precisa nunca sale de las partes de esa entrega.
 *
 * Para el MVP se difunden `order.status` e `incident`; el rastreo de posición (US7) reusa la
 * misma sala con el mensaje `position`.
 */
export class DeliveryRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Se esperaba WebSocket", { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ type: "hello", serverTime: Date.now() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    let msg: { type?: string; t?: number };
    try {
      msg = JSON.parse(message);
    } catch {
      return;
    }
    if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong", t: msg.t ?? Date.now() }));
    // El manejo de `position` (rastreo en vivo, US7) se añade en su fase.
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, "cerrado");
    } catch {
      /* ya cerrado */
    }
  }

  /** Difunde un evento a todas las conexiones de la orden (RPC desde las rutas). */
  async broadcast(event: DeliveryEvent): Promise<void> {
    const payload = JSON.stringify(event);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        /* conexión caída */
      }
    }
  }
}
