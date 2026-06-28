import { useState, type FormEvent } from "react";
import { Mail, MessageCircle } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../App";
import { t } from "../i18n";

type Channel = "email" | "phone";

/** Verificación de identidad ligera por OTP (correo o WhatsApp). Llama a `onAuthed` al entrar. */
export function IdentityGate({ onAuthed }: { onAuthed?: () => void }) {
  const { refresh } = useSession();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [channel, setChannel] = useState<Channel>("email");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [requestId, setRequestId] = useState("");
  const [devCode, setDevCode] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.requestCode(channel, contact);
      setRequestId(r.requestId);
      setDevCode(r.devCode);
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el código");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.verifyCode(requestId, code);
      await refresh();
      onAuthed?.();
    } catch {
      setError(t.identity.invalid);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>{t.identity.title}</h2>
      <p className="muted">{t.identity.why}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {step === "request" ? (
        <form onSubmit={sendCode}>
          <p style={{ fontWeight: 600, margin: "0.5rem 0 0.25rem" }}>{t.identity.chooseChannel}</p>
          <div className="chips" role="group" aria-label={t.identity.chooseChannel}>
            <button
              type="button"
              className="chip"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              aria-pressed={channel === "email"}
              onClick={() => setChannel("email")}
            >
              <Mail size={16} aria-hidden="true" /> {t.identity.byEmail}
            </button>
            <button
              type="button"
              className="chip"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              aria-pressed={channel === "phone"}
              onClick={() => setChannel("phone")}
            >
              <MessageCircle size={16} aria-hidden="true" /> {t.identity.byWhatsapp}
            </button>
          </div>

          {channel === "email" ? (
            <>
              <label htmlFor="contact">{t.identity.email}</label>
              <input
                id="contact"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </>
          ) : (
            <>
              <label htmlFor="contact">{t.identity.phone}</label>
              <input
                id="contact"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t.identity.phonePlaceholder}
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </>
          )}

          <div style={{ marginTop: "0.75rem" }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? t.identity.sending : t.identity.sendCode}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify}>
          {devCode ? (
            <p className="notice">
              {t.identity.devCodeNote} <strong>{devCode}</strong>
            </p>
          ) : (
            <p className="notice">{t.identity.sentNote}</p>
          )}
          <label htmlFor="code">{t.identity.code}</label>
          <input
            id="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <div style={{ marginTop: "0.75rem" }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? t.identity.verifying : t.identity.verify}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
