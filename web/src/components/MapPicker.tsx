import { useEffect, useRef } from "react";
import { createMapEngine, type MapEngine } from "./map/MapEngine";
import { useGeolocation } from "../hooks/useGeolocation";
import { t } from "../i18n";

/** Selector de zona en el mapa para publicar una necesidad (US1). */
export function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const geo = useGeolocation();

  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !ref.current) return;
      engine = e;
      engineRef.current = e;
      e.mount(ref.current, { center: geo.center, zoom: geo.zoom });
      e.enablePicker(onPick);
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // Se monta una sola vez; los cambios de geo se aplican abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter cuando llega la ubicación del usuario.
  useEffect(() => {
    if (geo.status === "ok") engineRef.current?.setView(geo.center.lat, geo.center.lng, 14);
  }, [geo.status, geo.center.lat, geo.center.lng]);

  return (
    <div>
      <p className="muted">{t.form.pickLocation}</p>
      <div
        ref={ref}
        role="application"
        aria-label={t.form.pickLocation}
        style={{ height: "300px", borderRadius: "10px", overflow: "hidden" }}
      />
      <p className="muted">{t.form.locationHelp}</p>
    </div>
  );
}
