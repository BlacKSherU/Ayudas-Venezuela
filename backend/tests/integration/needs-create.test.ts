import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, BASE } from "../helpers";

const CARACAS = { lat: 10.4955, lng: -66.9036 };

describe("crear necesidad (US1)", () => {
  it("crea con ubicación ofuscada y estado pendiente", async () => {
    const cookie = await authenticate("creadora@ejemplo.com");
    const res = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        urgency: "alta",
        location: CARACAS,
        items: [{ categoryCode: "agua", quantity: "20 L" }],
        note: "Familia con 2 niños",
      }),
    });
    expect(res.status).toBe(201);
    const need = (await res.json()) as {
      id: string;
      status: string;
      zone: { lat: number; lng: number };
    };
    expect(need.status).toBe("pendiente");
    // La ubicación pública está ofuscada (no coincide con la exacta).
    expect(need.zone.lat).not.toBe(CARACAS.lat);
    expect(need.zone.lng).not.toBe(CARACAS.lng);
    expect(Math.abs(need.zone.lat - CARACAS.lat)).toBeLessThan(0.02);
  });

  it("exige consentimiento para publicar contacto público (FR-016)", async () => {
    const cookie = await authenticate("contacto@ejemplo.com");
    const res = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        urgency: "media",
        location: { lat: 10.2, lng: -67.0 },
        items: [{ categoryCode: "alimentos", quantity: null }],
        contactPublic: "WhatsApp +58 000",
        contactPublicConsent: false,
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("CONSENT_REQUIRED");
  });

  it("rechaza publicar sin sesión", async () => {
    const res = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urgency: "baja",
        location: CARACAS,
        items: [{ categoryCode: "agua", quantity: null }],
      }),
    });
    expect(res.status).toBe(401);
  });

  it("rechaza ubicación fuera de Venezuela", async () => {
    const cookie = await authenticate("fuera@ejemplo.com");
    const res = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({
        urgency: "media",
        location: { lat: 40.4, lng: -3.7 }, // Madrid
        items: [{ categoryCode: "agua", quantity: null }],
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("OUT_OF_BOUNDS");
  });
});
