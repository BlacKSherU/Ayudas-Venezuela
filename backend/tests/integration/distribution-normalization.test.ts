import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authedIdentity, createProduct, BASE } from "../helpers";

describe("distribución y normalización (US6/US7)", () => {
  it("normalización: categorías sembradas con integridad y referencia de producto", async () => {
    const cats = await SELF.fetch(`${BASE}/products/categories`);
    const body = (await cats.json()) as { categories: { code: string }[] };
    const codes = body.categories.map((c) => c.code);
    expect(codes).toContain("alimentos");
    expect(codes).toContain("medicinas");
  });

  it("distribución agrega oferta (saldos) y demanda (necesidades) por producto y zona", async () => {
    const { cookie } = await authedIdentity("dist@ejemplo.com");
    const productId = await createProduct(cookie, "Aceite distribucion", "alimentos", "volumen", "mililitro");

    // Oferta: alta en inventario.
    await SELF.fetch(`${BASE}/inventory/items`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ productId, declaredQty: 2, declaredUnit: "litro" }),
    });

    // Demanda: necesidad pendiente con ese producto.
    await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        urgency: "media",
        location: { lat: 10.2, lng: -67.0 },
        items: [{ categoryCode: "alimentos", productId, quantity: "1" }],
      }),
    });

    const dist = await SELF.fetch(`${BASE}/distribution`);
    const body = (await dist.json()) as {
      byProduct: { product: { id: string }; supplyBase: number; demandCount: number }[];
      unmetByRegion: { regionCode: string; demandUnmet: number }[];
    };
    const row = body.byProduct.find((b) => b.product.id === productId);
    expect(row?.supplyBase).toBe(2000); // 2 litros = 2000 ml
    expect(row?.demandCount).toBeGreaterThanOrEqual(1);
    expect(body.unmetByRegion.length).toBeGreaterThanOrEqual(1);
  });
});
