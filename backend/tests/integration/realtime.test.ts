import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, BASE } from "../helpers";

const WS_URL = "http://localhost/api/v1/realtime?region=VE";

/** Espera el primer mensaje que cumpla el predicado, con timeout. */
function waitForMessage(
  ws: WebSocket,
  predicate: (data: Record<string, unknown>) => boolean,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout esperando mensaje")), timeoutMs);
    ws.addEventListener("message", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data as string) as Record<string, unknown>;
        if (predicate(data)) {
          clearTimeout(timer);
          resolve(data);
        }
      } catch {
        /* ignore */
      }
    });
  });
}

describe("tiempo real — MapRoom difunde need.created (US2)", () => {
  it("entrega en vivo una necesidad recién creada a un cliente suscrito", async () => {
    const res = await SELF.fetch(WS_URL, { headers: { Upgrade: "websocket" } });
    expect(res.status).toBe(101);
    const ws = res.webSocket!;
    ws.accept();

    // Suscribe el viewport (toda Venezuela) y filtro de pendientes.
    ws.send(
      JSON.stringify({
        type: "subscribe",
        bbox: [-73.4, 0.6, -59.8, 12.3],
        filters: { status: "pendiente" },
      }),
    );

    const received = waitForMessage(ws, (d) => d.type === "need.created");

    const cookie = await authenticate("realtime@ejemplo.com");
    const createRes = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        urgency: "alta",
        location: { lat: 10.5, lng: -66.91 },
        items: [{ categoryCode: "agua", quantity: null }],
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string };

    const event = await received;
    expect(event.type).toBe("need.created");
    expect((event.need as { id: string }).id).toBe(created.id);

    ws.close();
  });
});
