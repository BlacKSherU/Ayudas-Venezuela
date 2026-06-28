import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, registerTransportista, BASE } from "../helpers";

async function createNeed(cookie: string) {
  const res = await SELF.fetch(`${BASE}/needs`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      urgency: "alta",
      location: { lat: 10.491, lng: -66.902 },
      items: [{ categoryCode: "agua", quantity: "20 L" }],
    }),
  });
  return (await res.json()) as { id: string };
}

describe("flujo de orden de entrega (US2 + US3)", () => {
  it("crea, toma (exclusivo), recoge y entrega con códigos", async () => {
    // Necesitado publica una necesidad.
    const needyCookie = await authenticate("needy-flow@ejemplo.com");
    const need = await createNeed(needyCookie);

    // Donante prepara y publica la orden.
    const donorCookie = await authenticate("donor-flow@ejemplo.com");
    const orderRes = await SELF.fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { Cookie: donorCookie, "Content-Type": "application/json" },
      body: JSON.stringify({ needId: need.id, pickupLocation: { lat: 10.5, lng: -66.91 } }),
    });
    expect(orderRes.status).toBe(201);
    const created = (await orderRes.json()) as {
      order: { id: string; status: string };
      pickupCode: string;
      dropoffCode: string;
    };
    expect(created.order.status).toBe("disponible");
    const orderId = created.order.id;

    // Transportista 1 se registra y toma la orden.
    const t1 = await registerTransportista("t1-flow@ejemplo.com");
    const take = await SELF.fetch(`${BASE}/orders/${orderId}/take`, {
      method: "POST",
      headers: { Cookie: t1.cookie },
    });
    expect(take.status).toBe(200);
    const takeBody = (await take.json()) as {
      order: { status: string };
      dropoffExact: { lat: number; lng: number } | null;
    };
    expect(takeBody.order.status).toBe("tomada");
    // Al asignado se le revela el destino exacto (descifrado).
    expect(takeBody.dropoffExact).not.toBeNull();

    // Transportista 2 no puede tomarla (exclusividad).
    const t2 = await registerTransportista("t2-flow@ejemplo.com");
    const take2 = await SELF.fetch(`${BASE}/orders/${orderId}/take`, {
      method: "POST",
      headers: { Cookie: t2.cookie },
    });
    expect(take2.status).toBe(409);

    // Código de recogida incorrecto → 422.
    const badPickup = await SELF.fetch(`${BASE}/orders/${orderId}/pickup`, {
      method: "POST",
      headers: { Cookie: t1.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ code: "000000" }),
    });
    expect(badPickup.status).toBe(422);

    // Recogida con el código correcto.
    const pickup = await SELF.fetch(`${BASE}/orders/${orderId}/pickup`, {
      method: "POST",
      headers: { Cookie: t1.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ code: created.pickupCode }),
    });
    expect(pickup.status).toBe(200);

    // Entrega con el código del necesitado.
    const deliver = await SELF.fetch(`${BASE}/orders/${orderId}/deliver`, {
      method: "POST",
      headers: { Cookie: t1.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ code: created.dropoffCode }),
    });
    expect(deliver.status).toBe(200);
    const deliverBody = (await deliver.json()) as { order: { status: string } };
    expect(deliverBody.order.status).toBe("entregada");

    // La necesidad queda atendida.
    const needAfter = await SELF.fetch(`${BASE}/needs/${need.id}`);
    const needBody = (await needAfter.json()) as { status: string };
    expect(needBody.status).toBe("entregada");
  });
});
