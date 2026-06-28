import { SELF } from "cloudflare:test";

const BASE = "http://localhost/api/v1";

/** Verifica identidad ligera por OTP (modo desarrollo) y devuelve la cookie de sesión. */
export async function authenticate(contact = "persona@ejemplo.com"): Promise<string> {
  const reqRes = await SELF.fetch(`${BASE}/identity/request-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel: "email", contact }),
  });
  const reqBody = (await reqRes.json()) as { requestId: string; devCode?: string };
  if (!reqBody.devCode) throw new Error("Se esperaba devCode en entorno de desarrollo");

  const verRes = await SELF.fetch(`${BASE}/identity/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId: reqBody.requestId, code: reqBody.devCode }),
  });
  const setCookie = verRes.headers.get("set-cookie");
  if (!setCookie) throw new Error("No se recibió cookie de sesión");
  return setCookie.split(";")[0]!; // "session=<token>"
}

export { BASE };
