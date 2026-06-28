import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import { createMapEngine, type MapEngine } from "./map/MapEngine";
import { useGeolocation } from "../hooks/useGeolocation";
import { t } from "../i18n";

/** Selector de ubicación exacta en el mapa (US1). Permite tocar el mapa o usar mi ubicación. */
export function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const geo = useGeolocation();
  const [locating, setLocating] = useState(false);
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !ref.current) return;
      engine = e;
      engineRef.current = e;
      e.mount(ref.current, { center: geo.center, zoom: geo.zoom });
      e.enablePicker((lat, lng) => {
        setPicked(true);
        onPick(lat, lng);
      });
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  // Recenter cuando llega la ubicación del usuario.
  useEffect(() => {
    if (geo.status === "ok") engineRef.current?.setView(geo.center.lat, geo.center.lng, 15);
  }, [geo.status, geo.center.lat, geo.center.lng]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        engineRef.current?.setPickerMarker(latitude, longitude, 16);
        setPicked(true);
        onPick(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
        <p className="muted" style={{ margin: 0, flex: 1 }}>
          {t.form.pickLocation}
        </p>
        <button type="button" className="btn secondary" onClick={useMyLocation} disabled={locating}>
          <LocateFixed size={16} aria-hidden="true" /> {locating ? "Ubicando…" : "Usar mi ubicación actual"}
        </button>
      </div>
      <div
        ref={ref}
        role="application"
        aria-label={t.form.pickLocation}
        style={{ height: "300px", borderRadius: "10px", overflow: "hidden" }}
      />
      {picked ? (
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          Punto marcado. Puedes ajustarlo tocando otra vez el mapa.
        </p>
      ) : (
        <p className="muted" style={{ marginTop: "0.4rem" }}>
          {t.form.locationHelp}
        </p>
      )}
    </div>
  );
}
