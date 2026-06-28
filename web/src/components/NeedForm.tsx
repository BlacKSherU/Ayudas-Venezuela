import { useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useCategories } from "../App";
import { MapPicker } from "./MapPicker";
import { ProductPicker } from "./ProductPicker";
import { Stepper } from "./Stepper";
import { CategoryIcon } from "../lib/icons";
import { t } from "../i18n";
import type { Product, Urgency } from "../lib/types";

/** Formulario para publicar una necesidad (US1). */
export function NeedForm({ onPublished }: { onPublished?: () => void }) {
  const categories = useCategories();
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [urgency, setUrgency] = useState<Urgency>("media");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [products, setProducts] = useState<Product[]>([]);
  const [productCat, setProductCat] = useState("");
  const [note, setNote] = useState("");
  const [contact, setContact] = useState("");
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
    if (selected.size === 0 && products.length === 0) {
      setError(t.form.needItem);
      return;
    }
    setBusy(true);
    try {
      await api.createNeed({
        urgency,
        location,
        items: [
          ...[...selected].map((categoryCode) => ({ categoryCode, quantity: null })),
          ...products.map((p) => ({ categoryCode: p.categoryCode, productId: p.id, quantity: null })),
        ],
        note: note.trim() || null,
        contactPublic: contact.trim() || null,
        contactPublicConsent: true,
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

  // Productos específicos: se buscan dentro de las categorías ya marcadas en las pills.
  const selectedCats = categories.filter((c) => selected.has(c.code));
  const effectiveProductCat =
    productCat && selected.has(productCat) ? productCat : (selectedCats[0]?.code ?? "");

  const ubicacion = (
    <>
      <p className="notice" style={{ marginTop: 0, marginBottom: "0.5rem" }}>
        Tu ubicación se mostrará <strong>exacta y pública</strong> en el mapa para que la ayuda
        llegue al lugar correcto. Puedes editar o borrar tu publicación cuando quieras.
      </p>
      <MapPicker initial={location ?? undefined} onPick={(lat, lng) => setLocation({ lat, lng })} />
    </>
  );

  const insumos = (
    <>
      <label htmlFor="urgency" style={{ marginTop: 0 }}>
        {t.form.urgency}
      </label>
      <select id="urgency" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}>
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

      <fieldset style={{ border: "none", padding: 0, margin: "0.75rem 0 0" }}>
        <legend style={{ fontWeight: 600 }}>Productos específicos (opcional)</legend>
        {selected.size === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Elige arriba al menos un tipo de insumo para buscar productos específicos.
          </p>
        ) : (
          <>
            {selectedCats.length > 1 && (
              <select
                value={effectiveProductCat}
                onChange={(e) => setProductCat(e.target.value)}
                aria-label="Buscar productos de la categoría"
              >
                {selectedCats.map((c) => (
                  <option key={c.code} value={c.code}>
                    Productos de {c.labelEs}
                  </option>
                ))}
              </select>
            )}
            <div style={{ marginTop: selectedCats.length > 1 ? "0.5rem" : 0 }}>
              <ProductPicker
                categoryCode={effectiveProductCat}
                onPick={(p) => setProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]))}
              />
            </div>
          </>
        )}
        {products.length > 0 && (
          <div className="chips" style={{ marginTop: "0.5rem" }}>
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip"
                aria-pressed="true"
                onClick={() => setProducts((prev) => prev.filter((x) => x.id !== p.id))}
              >
                {p.name} ✕
              </button>
            ))}
          </div>
        )}
      </fieldset>
    </>
  );

  const detalle = (
    <>
      <label htmlFor="note" style={{ marginTop: 0 }}>
        {t.form.note}
      </label>
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
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Este contacto será público en el mapa.
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="action-bar">
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t.form.submitting : t.form.submit}
        </button>
      </div>
    </>
  );

  return (
    <form onSubmit={submit} className="card">
      <h2>{t.form.title}</h2>
      <Stepper
        steps={[
          { title: "Ubicación", content: ubicacion, canAdvance: !!location },
          {
            title: "Urgencia e insumos",
            content: insumos,
            canAdvance: selected.size > 0 || products.length > 0,
          },
          { title: "Nota y contacto", content: detalle },
        ]}
      />
    </form>
  );
}
