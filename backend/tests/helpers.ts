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

/** Sube una "foto de cédula" de prueba y devuelve su clave en R2. */
export async function uploadCedula(cookie: string): Promise<string> {
  const res = await SELF.fetch(`${BASE}/media?kind=cedula`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "image/jpeg" },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]),
  });
  const body = (await res.json()) as { key: string };
  return body.key;
}

/** Crea una identidad, sube cédula y registra un transportista. Devuelve cookie + supportId. */
export async function registerTransportista(
  contact: string,
): Promise<{ cookie: string; supportId: string }> {
  const cookie = await authenticate(contact);
  const key = await uploadCedula(cookie);
  const res = await SELF.fetch(`${BASE}/support/register`, {
    method: "POST",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({
      roleCode: "transportista",
      cedulaNumber: "V-12345678",
      cedulaPhotoMediaKey: key,
    }),
  });
  const body = (await res.json()) as { supportId: string };
  return { cookie, supportId: body.supportId };
}

export { BASE };
