import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authenticate, uploadCedula, BASE } from "../helpers";

describe("registro de personal de apoyo (US1)", () => {
  it("registra un transportista con cédula cifrada y nunca la expone", async () => {
    const cookie = await authenticate("transportista@ejemplo.com");
    const cedulaKey = await uploadCedula(cookie);

    const reg = await SELF.fetch(`${BASE}/support/register`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        roleCode: "transportista",
        cedulaNumber: "V-98765432",
        cedulaPhotoMediaKey: cedulaKey,
      }),
    });
    expect(reg.status).toBe(201);
    const regBody = (await reg.json()) as { supportId: string; status: string };
    expect(regBody.status).toBe("activo");

    // El perfil propio no expone la cédula.
    const me = await SELF.fetch(`${BASE}/support/me`, { headers: { Cookie: cookie } });
    const meBody = (await me.json()) as { support: { roleCode: string } & Record<string, unknown> };
    expect(meBody.support.roleCode).toBe("transportista");
    expect(JSON.stringify(meBody)).not.toContain("98765432");

    // La foto de cédula no se sirve por la vía pública de medios.
    const photo = await SELF.fetch(`${BASE}/media/${cedulaKey}`, { headers: { Cookie: cookie } });
    expect(photo.status).toBe(403);
  });

  it("rechaza un rol inválido", async () => {
    const cookie = await authenticate("rolmalo@ejemplo.com");
    const cedulaKey = await uploadCedula(cookie);
    const reg = await SELF.fetch(`${BASE}/support/register`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ roleCode: "astronauta", cedulaNumber: "V-1", cedulaPhotoMediaKey: cedulaKey }),
    });
    expect([400, 422]).toContain(reg.status);
  });
});
