import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { createMapEngine, type MapEngine } from "../components/map/MapEngine";
import { Filters, type FilterValue } from "../components/Filters";
import { NeedList } from "../components/NeedList";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRealtime } from "../hooks/useRealtime";
import { api } from "../lib/api";
import { t } from "../i18n";
import type { Bbox, Need } from "../lib/types";

/** Mapa interactivo en tiempo real: pieza central del portal (US2). */
export function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const bboxRef = useRef<Bbox | null>(null);
  const filtersRef = useRef<FilterValue>({ category: "", urgency: "" });

  const [filters, setFilters] = useState<FilterValue>({ category: "", urgency: "" });
  const [needs, setNeeds] = useState<Need[]>([]);
  const [online, setOnline] = useState(false);
  const [delivered, setDelivered] = useState<number | null>(null);
  const geo = useGeolocation();

  const fetchSnapshot = useCallback(async (bbox: Bbox) => {
    const f = filtersRef.current;
    try {
      const r = await api.listNeeds({
        bbox,
        status: "pendiente",
        category: f.category || undefined,
        urgency: f.urgency || undefined,
        limit: 500,
      });
      engineRef.current?.setNeeds(r.needs);
      setNeeds(r.needs);
    } catch {
      /* Mantener el estado actual ante error de red. */
    }
  }, []);

  const matchesFilters = (need: Need): boolean => {
    const f = filtersRef.current;
    return (
      need.status === "pendiente" &&
      (!f.category || need.items.some((i) => i.categoryCode === f.category)) &&
      (!f.urgency || need.urgency === f.urgency)
    );
  };

  const { updateBbox } = useRealtime({
    onEvent: (ev) => {
      if (ev.type === "need.created" || ev.type === "need.updated") {
        if (matchesFilters(ev.need)) {
          engineRef.current?.upsertNeed(ev.need);
          setNeeds((prev) => [ev.need, ...prev.filter((n) => n.id !== ev.need.id)]);
        } else {
          engineRef.current?.removeNeed(ev.need.id);
          setNeeds((prev) => prev.filter((n) => n.id !== ev.need.id));
        }
      } else if (ev.type === "need.closed") {
        engineRef.current?.removeNeed(ev.id);
        setNeeds((prev) => prev.filter((n) => n.id !== ev.id));
      }
    },
    onStatusChange: setOnline,
  });

  // Monta el motor de mapa una sola vez.
  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !mapRef.current) return;
      engine = e;
      engineRef.current = e;
      e.mount(mapRef.current, {
        center: geo.center,
        zoom: geo.zoom,
        onViewportChange: (bbox) => {
          bboxRef.current = bbox;
          void fetchSnapshot(bbox);
          updateBbox(bbox);
        },
      });
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentra cuando se resuelve la geolocalización.
  useEffect(() => {
    if (geo.status === "ok") engineRef.current?.setView(geo.center.lat, geo.center.lng, 13);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.status]);

  // Re-consulta el snapshot al cambiar los filtros.
  useEffect(() => {
    filtersRef.current = filters;
    if (bboxRef.current) void fetchSnapshot(bboxRef.current);
  }, [filters, fetchSnapshot]);

  // Fallback: si el tiempo real está caído, sondea cada 15 s (degradación elegante).
  useEffect(() => {
    if (online) return;
    const id = setInterval(() => {
      if (bboxRef.current) void fetchSnapshot(bboxRef.current);
    }, 15000);
    return () => clearInterval(id);
  }, [online, fetchSnapshot]);

  // Contador público de impacto (FR-015).
  useEffect(() => {
    api
      .stats()
      .then((s) => setDelivered(s.delivered))
      .catch(() => setDelivered(null));
  }, []);

  const geoDegraded = geo.status === "denied" || geo.status === "unavailable";

  return (
    <>
      <Filters value={filters} onChange={setFilters} />
      <div className="map-wrap">
        <div id="map" ref={mapRef} role="application" aria-label={t.map.title} />
        <div className={`map-status ${online ? "live" : "offline"}`} role="status">
          {online ? `● ${t.map.live}` : t.map.offline}
        </div>
      </div>
      {geoDegraded && (
        <p className="muted" style={{ padding: "0.5rem 1rem" }}>
          {t.map.noGeo}
        </p>
      )}
      <NeedList needs={needs} />
      {delivered !== null && delivered > 0 && (
        <p className="impact" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
          <CheckCircle2 size={16} aria-hidden="true" /> {delivered} {t.common.deliveredCount}
        </p>
      )}
    </>
  );
}
