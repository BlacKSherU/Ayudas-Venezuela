import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, BASE } from "../helpers";

// Cabudare (Lara), dentro de Venezuela.
const LOC = { lat: 10.0312, lng: -69.2712 };
const BBOX = "-70,9,-68,11"; // minLng,minLat,maxLng,maxLat alrededor de Lara

async function createCenter(cookie: string, name: string) {
  return SELF.fetch(`${BASE}/centers`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name, location: LOC, note: "L-V 8am-5pm" }),
  });
}

describe("centros de acopio (feature 4 · US4)", () => {
  it("crea un centro con ubicación exacta y lo lista por bbox", async () => {
    const cookie = await authenticate("centro1@ejemplo.com");
    const res = await createCenter(cookie, "Centro Cabudare");
    expect(res.status).toBe(201);
    const center = (await res.json()) as { id: string; location: { lat: number; lng: number } };
    // La ubicación es EXACTA (no ofuscada): coincide con la enviada.
    expect(center.location.lat).toBeCloseTo(LOC.lat, 4);
    expect(center.location.lng).toBeCloseTo(LOC.lng, 4);

    const list = await SELF.fetch(`${BASE}/centers?bbox=${BBOX}`);
    const body = (await list.json()) as { centers: { id: string }[] };
    expect(body.centers.some((x) => x.id === center.id)).toBe(true);
  });

  it("requiere sesión para crear un centro", async () => {
    const res = await SELF.fetch(`${BASE}/centers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sin sesión", location: LOC }),
    });
    expect(res.status).toBe(401);
  });

  it("aplica límite de tasa al crear demasiados centros (anti-abuso)", async () => {
    const cookie = await authenticate("spam@ejemplo.com");
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const r = await createCenter(cookie, `Centro ${i}`);
      lastStatus = r.status;
    }
    // El 6.º supera el tope (5/hora).
    expect(lastStatus).toBe(429);
  });

  it("oculta un centro tras suficientes reportes y deja de listarlo", async () => {
    const cookie = await authenticate("reportado@ejemplo.com");
    const res = await createCenter(cookie, "Centro Reportable");
    const center = (await res.json()) as { id: string };

    for (let i = 0; i < 3; i++) {
      await SELF.fetch(`${BASE}/centers/${center.id}/report`, { method: "POST" });
    }
    const list = await SELF.fetch(`${BASE}/centers?bbox=${BBOX}`);
    const body = (await list.json()) as { centers: { id: string }[] };
    expect(body.centers.some((x) => x.id === center.id)).toBe(false);
  });

  it("permite donar desde un centro propio (recogida = ubicación del centro)", async () => {
    // Necesidad pendiente de un necesitado.
    const needy = await authenticate("necesitado-c@ejemplo.com");
    const needRes = await SELF.fetch(`${BASE}/needs`, {
      method: "POST",
      headers: { Cookie: needy, "Content-Type": "application/json" },
      body: JSON.stringify({
        urgency: "alta",
        location: { lat: 10.05, lng: -69.3 },
        items: [{ categoryCode: "alimentos", quantity: "2 cajas" }],
      }),
    });
    const need = (await needRes.json()) as { id: string };

    // Donante con un centro propio.
    const donor = await authenticate("donante-c@ejemplo.com");
    const cRes = await createCenter(donor, "Centro Donante");
    const center = (await cRes.json()) as { id: string };

    const orderRes = await SELF.fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { Cookie: donor, "Content-Type": "application/json" },
      body: JSON.stringify({ needId: need.id, centerId: center.id }),
    });
    expect(orderRes.status).toBe(201);
    const out = (await orderRes.json()) as { order: { id: string } };
    expect(out.order.id).toBeTruthy();
  });
});

describe("voluntarios multi-rol (feature 4 · US3)", () => {
  it("permite registrar dos roles y los lista en /support/mine", async () => {
    const cookie = await authenticate("multirol@ejemplo.com");
    // Sube cédula (reutiliza media kind=cedula).
    const up = await SELF.fetch(`${BASE}/media?kind=cedula`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "image/jpeg" },
      body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]),
    });
    const { key } = (await up.json()) as { key: string };

    for (const roleCode of ["repartidor", "transportista"]) {
      const r = await SELF.fetch(`${BASE}/support/register`, {
        method: "POST",
        headers: { Cookie: cookie, "Content-Type": "application/json" },
        body: JSON.stringify({ roleCode, cedulaNumber: "V-555", cedulaPhotoMediaKey: key }),
      });
      expect(r.status).toBe(201);
    }
    const mine = await SELF.fetch(`${BASE}/support/mine`, { headers: { Cookie: cookie } });
    const body = (await mine.json()) as { roles: { roleCode: string }[] };
    const roles = body.roles.map((x) => x.roleCode).sort();
    expect(roles).toEqual(["repartidor", "transportista"]);
  });

  it("donar a un centro crea la orden y el dueño la ve con su código de recepción", async () => {
    const owner = await authenticate("dueno-centro@ejemplo.com");
    const created = await createCenter(owner, "Centro Receptor");
    const center = (await created.json()) as { id: string };

    const donor = await authenticate("donante-centro@ejemplo.com");
    const res = await SELF.fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { Cookie: donor, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCenterId: center.id,
        items: [{ categoryCode: "agua", quantity: "10 L" }],
        pickupLocation: { lat: 10.05, lng: -69.3 },
      }),
    });
    expect(res.status).toBe(201);
    const order = (await res.json()) as {
      order: { id: string };
      pickupCode: string;
      dropoffCode: string;
    };
    expect(order.pickupCode).toBeTruthy();
    expect(order.dropoffCode).toBeTruthy();

    // El dueño del centro es dueño de la necesidad interna: ve la orden en sus entregas entrantes.
    const incoming = await SELF.fetch(`${BASE}/orders/incoming`, { headers: { Cookie: owner } });
    const inc = (await incoming.json()) as { orders: { id: string; dropoffCode: string | null }[] };
    const match = inc.orders.find((o) => o.id === order.order.id);
    expect(match).toBeTruthy();
    expect(match?.dropoffCode).toBe(order.dropoffCode);
  });

  it("donar a un centro requiere indicar insumos", async () => {
    const owner = await authenticate("dueno-sin-items@ejemplo.com");
    const created = await createCenter(owner, "Centro Sin Items");
    const center = (await created.json()) as { id: string };

    const donor = await authenticate("donante-sin-items@ejemplo.com");
    const res = await SELF.fetch(`${BASE}/orders`, {
      method: "POST",
      headers: { Cookie: donor, "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCenterId: center.id,
        items: [],
        pickupLocation: { lat: 10.05, lng: -69.3 },
      }),
    });
    expect(res.status).toBe(400);
  });
});
