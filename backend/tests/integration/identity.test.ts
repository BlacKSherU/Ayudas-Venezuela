import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { BASE } from "../helpers";

describe("identidad ligera (OTP + sesión)", () => {
  it("solicita un código y abre sesión al verificarlo", async () => {
    const reqRes = await SELF.fetch(`${BASE}/identity/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "email", contact: "ana@ejemplo.com" }),
    });
    expect(reqRes.status).toBe(202);
    const reqBody = (await reqRes.json()) as { requestId: string; devCode?: string };
    expect(reqBody.requestId).toBeTruthy();
    expect(reqBody.devCode).toMatch(/^\d{6}$/);

    const verRes = await SELF.fetch(`${BASE}/identity/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: reqBody.requestId, code: reqBody.devCode }),
    });
    expect(verRes.status).toBe(200);
    const verBody = (await verRes.json()) as { identityId: string };
    expect(verBody.identityId).toBeTruthy();

    const cookie = verRes.headers.get("set-cookie")!.split(";")[0]!;
    const meRes = await SELF.fetch(`${BASE}/identity/me`, { headers: { Cookie: cookie } });
    const meBody = (await meRes.json()) as { identityId: string | null };
    expect(meBody.identityId).toBe(verBody.identityId);
  });

  it("rechaza un código incorrecto", async () => {
    const reqRes = await SELF.fetch(`${BASE}/identity/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "email", contact: "luis@ejemplo.com" }),
    });
    const { requestId } = (await reqRes.json()) as { requestId: string };
    const verRes = await SELF.fetch(`${BASE}/identity/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, code: "000000" }),
    });
    expect(verRes.status).toBe(401);
  });
});
