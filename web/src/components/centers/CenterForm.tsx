import { useEffect, useRef, useState, type FormEvent } from "react";
import { createMapEngine, type MapEngine } from "../map/MapEngine";
import { useGeolocation } from "../../hooks/useGeolocation";
import { api, ApiError } from "../../lib/api";
import type { Center, MyCenter } from "../../lib/types";

/**
 * Registrar/editar un centro de acopio (feature 4, US4). La ubicación es EXACTA y pública
 * (es un punto al que la gente acude), a diferencia de los hogares de necesitados.
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
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const geo = useGeolocation();
  const [name, setName] = useState(existing?.name ?? "");
  const [note, setNote] = useState(existing?.note ?? "");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    existing ? existing.location : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !ref.current) return;
      engine = e;
      engineRef.current = e;
      const center = existing?.location ?? geo.center;
      e.mount(ref.current, { center, zoom: existing ? 16 : geo.zoom });
      e.enablePicker((lat, lng) => setPoint({ lat, lng }));
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!existing && geo.status === "ok")
      engineRef.current?.setView(geo.center.lat, geo.center.lng, 15);
  }, [geo.status, geo.center.lat, geo.center.lng, existing]);

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

  return (
    <form className="card" onSubmit={submit}>
      <h3>{existing ? "Editar centro de acopio" : "Registrar centro de acopio"}</h3>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <label htmlFor="center-name">Nombre del centro</label>
      <input
        id="center-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        minLength={3}
        maxLength={80}
        placeholder="Ej.: Iglesia San José, Cabudare"
      />

      <p style={{ fontWeight: 600, margin: "0.75rem 0 0.25rem" }}>Ubicación exacta (pública)</p>
      <p className="muted">
        Toca el mapa para marcar el punto exacto del centro. A diferencia de los hogares, un
        centro de acopio es un lugar público: su ubicación se mostrará tal cual para que la
        gente sepa dónde llevar o recoger donaciones.
      </p>
      <div
        ref={ref}
        role="application"
        aria-label="Marcar la ubicación exacta del centro"
        style={{ height: "300px", borderRadius: "10px", overflow: "hidden" }}
      />
      {point && (
        <p className="muted">
          Punto: {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
        </p>
      )}

      <label htmlFor="center-note">Horario o indicaciones (opcional)</label>
      <input
        id="center-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder="Ej.: Lun a Vie, 8am–5pm"
      />

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        {onCancel && (
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "Guardando…" : existing ? "Guardar cambios" : "Registrar centro"}
        </button>
      </div>
    </form>
  );
}
