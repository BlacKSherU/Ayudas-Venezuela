import type { Env } from "../types";

// Cifrado AES-GCM (WebCrypto) para datos sensibles: número de cédula, foto de cédula y
// coordenadas exactas. Se persiste ciphertext + IV (base64). La clave vive en un secret.

export const KEY_VERSION = 1;
const DEV_KEY_B64 = "ZGV2LWluc2VjdXJlLWtleS0zMmJ5dGVzLWNoYW5nZS1tZSEh"; // solo desarrollo/tests

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function importKey(env: Env): Promise<CryptoKey> {
  let raw = b64ToBytes(env.ENCRYPTION_KEY ?? DEV_KEY_B64);
  // Normaliza a 32 bytes (AES-256): si la clave dev no mide 32, ajústala de forma estable.
  if (raw.length !== 32) {
    const digest = await crypto.subtle.digest("SHA-256", raw);
    raw = new Uint8Array(digest);
  }
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Cifra bytes; devuelve ciphertext + iv en base64. */
export async function encryptBytes(
  env: Env,
  data: Uint8Array,
): Promise<{ enc: string; iv: string; keyVersion: number }> {
  const key = await importKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return { enc: bytesToB64(new Uint8Array(ct)), iv: bytesToB64(iv), keyVersion: KEY_VERSION };
}

/** Descifra ciphertext + iv (base64) a bytes. */
export async function decryptBytes(env: Env, enc: string, iv: string): Promise<Uint8Array> {
  const key = await importKey(env);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(iv) },
    key,
    b64ToBytes(enc),
  );
  return new Uint8Array(pt);
}

/** Cifra bytes en un único blob `iv(12) ++ ciphertext` (para objetos binarios en R2). */
export async function encryptEnvelope(env: Env, data: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return out;
}

/** Descifra un blob `iv(12) ++ ciphertext`. */
export async function decryptEnvelope(env: Env, blob: Uint8Array): Promise<Uint8Array> {
  const key = await importKey(env);
  const iv = blob.slice(0, 12);
  const ct = blob.slice(12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Cifra una cadena de texto (p. ej. número de cédula o "lat,lng"). */
export async function encryptText(env: Env, text: string) {
  return encryptBytes(env, encoder.encode(text));
}

/** Descifra a texto. */
export async function decryptText(env: Env, enc: string, iv: string): Promise<string> {
  return decoder.decode(await decryptBytes(env, enc, iv));
}

/** Cifra una coordenada exacta como "lat,lng". */
export async function encryptCoord(env: Env, lat: number, lng: number) {
  return encryptText(env, `${lat},${lng}`);
}

/** Descifra una coordenada exacta. */
export async function decryptCoord(
  env: Env,
  enc: string,
  iv: string,
): Promise<{ lat: number; lng: number }> {
  const [lat, lng] = (await decryptText(env, enc, iv)).split(",").map(Number);
  return { lat: lat ?? 0, lng: lng ?? 0 };
}
