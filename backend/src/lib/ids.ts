/** Genera un identificador único (UUID v4) para claves primarias TEXT. */
export function newId(): string {
  return crypto.randomUUID();
}
