import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useCategories } from "../App";
import { MapPicker } from "./MapPicker";
import { CategoryIcon } from "../lib/icons";
import { t } from "../i18n";
import type { Urgency } from "../lib/types";

/** Formulario para publicar una necesidad (US1). */
export function NeedForm({ onPublished }: { onPublished?: () => void }) {
  const categories = useCategories();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!location) {
      setError(t.form.needLocation);
      return;
    }
    if (selected.size === 0) {
      setError(t.form.needItem);
      return;
    }
    setBusy(true);
    try {
      await api.createNeed({
        urgency,
        location,
        items: [...selected].map((categoryCode) => ({ categoryCode, quantity: null })),
        note: note.trim() || null,
        contactPublic: contact.trim() || null,
        contactPublicConsent: consent,
      });
      setDone(true);
      onPublished?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo publicar");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="notice" role="status">
        {t.form.success}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>{t.form.title}</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <MapPicker onPick={(lat, lng) => setLocation({ lat, lng })} />

      <label htmlFor="urgency">{t.form.urgency}</label>
      <select
        id="urgency"
        value={urgency}
        onChange={(e) => setUrgency(e.target.value as Urgency)}
      >
        <option value="alta">{t.urgency.alta}</option>
        <option value="media">{t.urgency.media}</option>
        <option value="baja">{t.urgency.baja}</option>
      </select>

      <fieldset style={{ border: "none", padding: 0, margin: "0.75rem 0 0" }}>
        <legend style={{ fontWeight: 600 }}>{t.form.items}</legend>
        <div className="chips" role="group" aria-label={t.form.items}>
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.code}
              className="chip"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
              aria-pressed={selected.has(cat.code)}
              onClick={() => toggle(cat.code)}
            >
              <CategoryIcon code={cat.code} /> {cat.labelEs}
            </button>
          ))}
        </div>
      </fieldset>

      <label htmlFor="note">{t.form.note}</label>
      <textarea
        id="note"
        maxLength={280}
        value={note}
        placeholder={t.form.notePlaceholder}
        onChange={(e) => setNote(e.target.value)}
      />

      <label htmlFor="contact">{t.form.contactPublic}</label>
      <input
        id="contact"
        value={contact}
        placeholder={t.form.contactPlaceholder}
        onChange={(e) => setContact(e.target.value)}
      />
      {contact.trim() && (
        <div className="warning" style={{ marginTop: "0.5rem" }}>
          <p style={{ margin: "0 0 0.5rem" }}>{t.form.contactWarning}</p>
          <label style={{ display: "flex", gap: "0.5rem", fontWeight: 400 }}>
            <input
              type="checkbox"
              style={{ width: "auto", minHeight: "auto" }}
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            {t.form.contactConsent}
          </label>
        </div>
      )}

      <div style={{ marginTop: "1rem" }}>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t.form.submitting : t.form.submit}
        </button>
      </div>
    </form>
  );
}
