import type { Context } from "hono";

/** Error de aplicación con código y estado HTTP, para una envoltura de error uniforme. */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

/** Envía una respuesta de error con el formato `{ error: { code, message } }`. */
export function sendError(c: Context, err: unknown) {
  if (err instanceof AppError) {
    return c.json(errorBody(err.code, err.message), err.status as 400);
  }
  console.error(JSON.stringify({ event: "unhandled_error", message: String(err) }));
  return c.json(errorBody("INTERNAL", "Error interno del servidor"), 500);
}
