import { WorkerMailer } from "worker-mailer";
import type { AuthType } from "worker-mailer";
import type { Env } from "../types";
import { logEvent } from "./audit";

/** ¿Hay credenciales SMTP configuradas? */
export function smtpConfigured(env: Env): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

/**
 * Envía el código OTP por correo mediante SMTP (sobre la API de sockets de Cloudflare).
 * Puerto 465 → TLS implícito; 587 (u otro) → STARTTLS.
 */
export async function sendOtpEmail(env: Env, to: string, code: string): Promise<void> {
  const port = Number(env.SMTP_PORT ?? "587");
  const from = env.EMAIL_FROM || env.SMTP_USER!;
  const authType = (env.SMTP_AUTH as AuthType) || "login";

  await WorkerMailer.send(
    {
      host: env.SMTP_HOST!,
      port,
      secure: port === 465,
      startTls: port !== 465,
      credentials: { username: env.SMTP_USER!, password: env.SMTP_PASS! },
      authType,
    },
    {
      from: { name: "Ayuda Venezuela", email: from },
      to: { email: to },
      subject: "Tu código de acceso — Ayuda Venezuela",
      text:
        `Tu código de verificación es: ${code}\n\n` +
        `Vence en 10 minutos. Úsalo para gestionar tus publicaciones en el portal.\n` +
        `Si no lo solicitaste, ignora este correo.`,
    },
  );
  logEvent("otp.email_sent", {});
}
