import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authedIdentity, createProduct, registerTransportista, BASE } from "../helpers";

describe("custodia en dos pasos vía orden (US5)", () => {
  it("recogida y entrega crean movimientos donante→transportista→necesitado", async () => {
    // Necesitado publica una necesidad con un producto específico.
    const needy = await authedIdentity("needy-cust@ejemplo.com");
    const productId = await createProduct(needy.cookie, "Harina custodia");
    const needRes = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { Cookie: needy.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        urgency: "alta",
        location: { lat: 10.49, lng: -66.9 },
        items: [{ categoryCode: "alimentos", productId, quantity: "1 saco" }],
      }),
    });
    const need = (await needRes.json()) as { id: string };

    // Donante publica la orden.
    const donor = await authedIdentity("donor-cust@ejemplo.com");
    const orderRes = await SELF.fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { Cookie: donor.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ needId: need.id, pickupLocation: { lat: 10.5, lng: -66.91 } }),
    });
    const created = (await orderRes.json()) as { order: { id: string }; pickupCode: string; dropoffCode: string };
    const orderId = created.order.id;

    // Transportista toma, recoge y entrega.
    const t = await registerTransportista("t-cust@ejemplo.com");
    await SELF.fetch(`${BASE}/orders/${orderId}/take`, { method: "POST", headers: { Cookie: t.cookie } });
    await SELF.fetch(`${BASE}/orders/${orderId}/pickup`, {
      method: "POST",
      headers: { Cookie: t.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ code: created.pickupCode }),
    });
    await SELF.fetch(`${BASE}/orders/${orderId}/deliver`, {
      method: "POST",
      headers: { Cookie: t.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ code: created.dropoffCode }),
    });

    // El donante tiene un movimiento de salida por recogida.
    const donorLedger = await SELF.fetch(`${BASE}/inventory/${donor.identityId}/ledger`);
    const donorMoves = (await donorLedger.json()) as { movements: { type: string }[] };
    expect(donorMoves.movements.some((m) => m.type === "salida_recogida")).toBe(true);

    // El necesitado recibió el producto en su inventario.
    const needyInv = await SELF.fetch(`${BASE}/inventory/${needy.identityId}`);
    const needyBal = (await needyInv.json()) as { balances: { product: { id: string }; qtyBase: number }[] };
    expect(needyBal.balances.find((b) => b.product.id === productId)?.qtyBase).toBe(1);
  });
});
