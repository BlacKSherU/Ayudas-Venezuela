import { useState, type FormEvent } from "react";
import { MapPicker } from "../MapPicker";
import { Stepper } from "../Stepper";
import { api, ApiError } from "../../lib/api";
import type { Center, MyCenter } from "../../lib/types";

/**
 * Registrar/editar un centro de acopio (feature 4, US4). Ubicación EXACTA y pública. En móvil
 * es un wizard (datos → ubicación); en escritorio, una sola página.
 */
export function CenterForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: MyCenter;
  onSaved: (center: Center) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    existing ? existing.location : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!point) {
      setError("Marca en el mapa la ubicación exacta del centro.");
      return;
    }
    setBusy(true);
    try {
      const saved = existing
        ? await api.updateCenter(existing.id, { name: name.trim(), location: point, note: note.trim() || null })
        : await api.createCenter({ name: name.trim(), location: point, note: note.trim() || null });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el centro");
    } finally {
      setBusy(false);
    }
  }

  const datos = (
    <>
      <label htmlFor="center-name" style={{ marginTop: 0 }}>
        Nombre del centro
      </label>
      <input
        id="center-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={3}
        maxLength={80}
        placeholder="Ej.: Iglesia San José, Cabudare"
      />
      <label htmlFor="center-note">Horario o indicaciones (opcional)</label>
      <input
        id="center-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder="Ej.: Lun a Vie, 8am–5pm"
      />
    </>
  );

  const ubicacion = (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Un centro de acopio es un lugar público: su ubicación se mostrará <strong>exacta</strong>{" "}
        en el mapa para que la gente sepa dónde llevar o recoger donaciones.
      </p>
      <MapPicker initial={point ?? undefined} onPick={(lat, lng) => setPoint({ lat, lng })} />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="action-bar">
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Guardando…" : existing ? "Guardar cambios" : "Registrar centro"}
        </button>
      </div>
    </>
  );

  return (
    <form className="card" onSubmit={submit}>
      <h3>{existing ? "Editar centro de acopio" : "Registrar centro de acopio"}</h3>
      <Stepper
        steps={[
          { title: "Datos del centro", content: datos, canAdvance: name.trim().length >= 3 },
          { title: "Ubicación", content: ubicacion },
        ]}
      />
    </form>
  );
}
