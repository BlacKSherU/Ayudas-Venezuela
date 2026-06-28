import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, BASE } from "../helpers";

const VE_BBOX = "-73.4,0.6,-59.8,12.3";

async function createNeed(cookie: string, body: unknown) {
  const res = await SELF.fetch(`${BASE}/needs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  return res;
}

describe("listar necesidades por bbox y filtros (US2)", () => {
  it("devuelve necesidades dentro del bbox", async () => {
    const cookie = await authenticate("lista1@ejemplo.com");
    await createNeed(cookie, {
      urgency: "alta",
      location: { lat: 10.49, lng: -66.9 },
      items: [{ categoryCode: "agua", quantity: null }],
    });

    const res = await SELF.fetch(`${BASE}/needs?bbox=${VE_BBOX}&status=pendiente`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { needs: unknown[]; count: number };
    expect(body.count).toBeGreaterThanOrEqual(1);
  });

  it("filtra por categoría", async () => {
    const cookie = await authenticate("lista2@ejemplo.com");
    await createNeed(cookie, {
      urgency: "media",
      location: { lat: 8.6, lng: -70.2 },
      items: [{ categoryCode: "medicinas", quantity: null }],
    });

    const matching = await SELF.fetch(`${BASE}/needs?bbox=${VE_BBOX}&category=medicinas`);
    const matchingBody = (await matching.json()) as { needs: { items: { categoryCode: string }[] }[] };
    expect(matchingBody.needs.every((n) => n.items.some((i) => i.categoryCode === "medicinas"))).toBe(
      true,
    );
  });

  it("excluye necesidades fuera del bbox consultado", async () => {
    const cookie = await authenticate("lista3@ejemplo.com");
    await createNeed(cookie, {
      urgency: "baja",
      location: { lat: 10.5, lng: -66.9 }, // Caracas
      items: [{ categoryCode: "higiene", quantity: null }],
    });
    // bbox pequeño alrededor de Maracaibo (no debe incluir Caracas).
    const res = await SELF.fetch(`${BASE}/needs?bbox=-72.0,10.5,-71.5,10.8`);
    const body = (await res.json()) as { needs: { zone: { lng: number } }[] };
    expect(body.needs.every((n) => n.zone.lng <= -71.5)).toBe(true);
  });
});
