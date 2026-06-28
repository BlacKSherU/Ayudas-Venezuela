import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, BASE } from "../helpers";

describe("catálogo de productos (US1)", () => {
  it("deduplica por nombre normalizado (Arroz / arroz / ARROZ → mismo)", async () => {
    const cookie = await authenticate("prod@ejemplo.com");
    const mk = async (name: string) => {
      const res = await SELF.fetch(`${BASE}/products`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ name, categoryCode: "alimentos", dimension: "masa", baseUnit: "gramo" }),
      });
      return (await res.json()) as { id: string; name: string };
    };
    const a = await mk("Arroz");
    const b = await mk("Arroz ");
    const c = await mk("ARROZ");
    expect(b.id).toBe(a.id);
    expect(c.id).toBe(a.id);

    const search = await SELF.fetch(`${BASE}/products?search=arr`);
    const body = (await search.json()) as { products: { id: string }[] };
    expect(body.products.some((p) => p.id === a.id)).toBe(true);
  });

  it("rechaza crear producto sin sesión", async () => {
    const res = await SELF.fetch(`${BASE}/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Aceite", categoryCode: "alimentos", dimension: "volumen", baseUnit: "mililitro" }),
    });
    expect(res.status).toBe(401);
  });
});
