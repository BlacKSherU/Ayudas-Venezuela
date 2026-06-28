import { sha256Hex, timingSafeEqual } from "./crypto";

// Códigos de un solo uso para confirmar recogida y entrega (FR-011). Se almacena solo el
// hash; el transportista debe introducir el código que le da el donante / necesitado.

/** Genera un código numérico de 6 dígitos. */
export function generateCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(6, "0");
}

export async function hashCode(code: string): Promise<string> {
  return sha256Hex(code.trim());
}

export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return timingSafeEqual(await hashCode(code), hash);
}
