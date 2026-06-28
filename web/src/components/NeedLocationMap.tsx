import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { createMapEngine, type MapEngine } from "./map/MapEngine";
import type { Need } from "../lib/types";

/**
 * Mapa de solo lectura con la zona APROXIMADA de una necesidad (feature 4). Ayuda al donante a
 * saber dónde está la ayuda al donar (sobre todo en entrega en mano). La ubicación exacta es
 * privada por diseño; se coordina con la persona (contacto público si lo compartió).
 */
export function NeedLocationMap({ need }: { need: Need }) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);

  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !ref.current) return;
      engine = e;
      engineRef.current = e;
      e.mount(ref.current, { center: need.zone, zoom: 16 });
      e.setNeeds([need]);
      e.setView(need.zone.lat, need.zone.lng, 16);
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // Se remonta si cambia la necesidad mostrada.
  }, [need.id]); // eslint-disable-line

  return (
    <div style={{ margin: "0.5rem 0 1rem" }}>
      <p className="muted" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
        <MapPin size={14} aria-hidden="true" /> Ubicación de la necesidad
      </p>
      <div
        ref={ref}
        role="application"
        aria-label="Ubicación de la necesidad"
        style={{ height: "240px", borderRadius: "10px", overflow: "hidden" }}
      />
      <p className="muted" style={{ marginTop: "0.4rem" }}>
        Ubicación exacta del punto donde se necesita la ayuda.
      </p>
    </div>
  );
}
