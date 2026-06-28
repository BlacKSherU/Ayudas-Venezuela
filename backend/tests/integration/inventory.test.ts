import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authedIdentity, createProduct, BASE } from "../helpers";

describe("inventario, conversiones, libro y bajas (US2/US3/US4)", () => {
  it("alta con conversión, saldo público, libro inmutable y baja", async () => {
    const { cookie, identityId } = await authedIdentity("inv@ejemplo.com");
    const productId = await createProduct(cookie, "Arroz inventario");

    // Alta de 5 kg → 5000 g (unidad base).
    const alta = await SELF.fetch(`${BASE}/inventory/items`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ productId, declaredQty: 5, declaredUnit: "kg" }),
    });
    expect(alta.status).toBe(201);
    const altaBody = (await alta.json()) as { qtyBase: number };
    expect(altaBody.qtyBase).toBe(5000);

    // Inventario público (sin sesión).
    const inv = await SELF.fetch(`${BASE}/inventory/${identityId}`);
    const invBody = (await inv.json()) as { balances: { product: { id: string }; qtyBase: number }[] };
    expect(invBody.balances.find((b) => b.product.id === productId)?.qtyBase).toBe(5000);

    // Libro público con el movimiento de alta.
    const ledger = await SELF.fetch(`${BASE}/inventory/${identityId}/ledger`);
    const ledgerBody = (await ledger.json()) as { movements: { type: string }[] };
    expect(ledgerBody.movements.some((m) => m.type === "alta")).toBe(true);

    // Baja de 1 kg → saldo 4000 g.
    const baja = await SELF.fetch(`${BASE}/inventory/items/${productId}/decrease`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ declaredQty: 1, declaredUnit: "kg", reason: "consumido" }),
    });
    expect(baja.status).toBe(200);
    expect(((await baja.json()) as { qtyBase: number }).qtyBase).toBe(4000);

    // Baja mayor al saldo → 422.
    const bajaMala = await SELF.fetch(`${BASE}/inventory/items/${productId}/decrease`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ declaredQty: 999, declaredUnit: "kg", reason: "roto" }),
    });
    expect(bajaMala.status).toBe(422);
  });
});
