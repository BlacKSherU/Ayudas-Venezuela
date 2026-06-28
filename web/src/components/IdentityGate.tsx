import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../App";
import { t } from "../i18n";

/** Verificación de identidad ligera por OTP. Llama a `onAuthed` al iniciar sesión. */
export function IdentityGate({ onAuthed }: { onAuthed?: () => void }) {
  const { refresh } = useSession();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [email, setEmail] = useState("");
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
      const r = await api.requestCode("email", email);
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
          <label htmlFor="email">{t.identity.email}</label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ marginTop: "0.75rem" }}>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? t.identity.sending : t.identity.sendCode}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={verify}>
          {devCode && (
            <p className="notice">
              {t.identity.devCodeNote} <strong>{devCode}</strong>
            </p>
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
