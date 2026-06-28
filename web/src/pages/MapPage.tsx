import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Search, MapPin, Warehouse, Users } from "lucide-react";
import { createMapEngine, type MapEngine } from "../components/map/MapEngine";
import { Filters, type FilterValue } from "../components/Filters";
import { NeedList } from "../components/NeedList";
import { useGeolocation } from "../hooks/useGeolocation";
import { useRealtime } from "../hooks/useRealtime";
import { useCategories } from "../App";
import { api } from "../lib/api";
import { t } from "../i18n";
import type { Bbox, Center, Need } from "../lib/types";

/**
 * Mapa interactivo en tiempo real (pieza central). En PC: layout de pantalla completa sin
 * scroll, con la lista de necesidades + buscador + filtros de capa a la izquierda y el mapa a
 * la derecha. En móvil: se apila (controles, mapa, lista).
 */
export function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const bboxRef = useRef<Bbox | null>(null);
  const filtersRef = useRef<FilterValue>({ category: "", urgency: "" });
  const categories = useCategories();

  const [filters, setFilters] = useState<FilterValue>({ category: "", urgency: "" });
  const [needs, setNeeds] = useState<Need[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [online, setOnline] = useState(false);
  const [delivered, setDelivered] = useState<number | null>(null);
  const [listSearch, setListSearch] = useState("");
  // Capas del mapa (qué mostrar).
  const [showNeeds, setShowNeeds] = useState(true);
  const [showCenters, setShowCenters] = useState(true);
  const geo = useGeolocation();

  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

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
      setNeeds(r.needs);
    } catch {
      /* Mantener el estado actual ante error de red. */
    }
  }, []);

  const fetchCenters = useCallback(async (bbox: Bbox) => {
    try {
      const r = await api.listCenters(bbox);
      setCenters(r.centers);
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
        setNeeds((prev) =>
          matchesFilters(ev.need)
            ? [ev.need, ...prev.filter((n) => n.id !== ev.need.id)]
            : prev.filter((n) => n.id !== ev.need.id),
        );
      } else if (ev.type === "need.closed") {
        setNeeds((prev) => prev.filter((n) => n.id !== ev.id));
      } else if (ev.type === "center.created") {
        setCenters((prev) => [ev.center, ...prev.filter((c) => c.id !== ev.center.id)]);
      } else if (ev.type === "center.removed") {
        setCenters((prev) => prev.filter((c) => c.id !== ev.id));
      }
    },
    onStatusChange: setOnline,
  });

  // Sincroniza las capas del motor con el estado + los toggles.
  useEffect(() => {
    engineRef.current?.setNeeds(showNeeds ? needs : []);
  }, [needs, showNeeds]);
  useEffect(() => {
    engineRef.current?.setCenters(showCenters ? centers : []);
  }, [centers, showCenters]);

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
          void fetchCenters(bbox);
          updateBbox(bbox);
        },
      });
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (geo.status === "ok") engineRef.current?.setView(geo.center.lat, geo.center.lng, 13);
    // eslint-disable-next-line
  }, [geo.status]);

  useEffect(() => {
    filtersRef.current = filters;
    if (bboxRef.current) void fetchSnapshot(bboxRef.current);
  }, [filters, fetchSnapshot]);

  // Fallback: si el tiempo real está caído, sondea cada 15 s.
  useEffect(() => {
    if (online) return;
    const id = setInterval(() => {
      if (bboxRef.current) {
        void fetchSnapshot(bboxRef.current);
        void fetchCenters(bboxRef.current);
      }
    }, 15000);
    return () => clearInterval(id);
  }, [online, fetchSnapshot, fetchCenters]);

  useEffect(() => {
    api
      .stats()
      .then((s) => setDelivered(s.delivered))
      .catch(() => setDelivered(null));
  }, []);

  // Filtrado de la lista por el buscador (sobre insumos, nota y región).
  const listNeeds = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return needs;
    return needs.filter((n) => {
      const items = n.items.map((i) => label(i.categoryCode)).join(" ").toLowerCase();
      return (
        items.includes(q) ||
        (n.note ?? "").toLowerCase().includes(q) ||
        n.regionCode.toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line
  }, [needs, listSearch, categories]);

  const geoDegraded = geo.status === "denied" || geo.status === "unavailable";

  return (
    <div className="map-layout">
      {/* Controles (sidebar superior en PC; arriba en móvil) */}
      <div className="map-controls">
        <div className="map-search">
          <Search size={16} aria-hidden="true" className="map-search-icon" />
          <input
            type="search"
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Buscar en la lista…"
            aria-label="Buscar necesidades en la lista"
          />
        </div>

        <div className="layer-toggles" role="group" aria-label="Qué mostrar en el mapa">
          <button
            type="button"
            className="chip"
            aria-pressed={showNeeds}
            onClick={() => setShowNeeds((v) => !v)}
          >
            <MapPin size={14} aria-hidden="true" /> Necesidades
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={showCenters}
            onClick={() => setShowCenters((v) => !v)}
          >
            <Warehouse size={14} aria-hidden="true" /> Centros
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={false}
            disabled
            title="Próximamente"
          >
            <Users size={14} aria-hidden="true" /> Voluntarios
          </button>
        </div>

        <Filters value={filters} onChange={setFilters} />
        {geoDegraded && <p className="muted map-geo-note">{t.map.noGeo}</p>}
      </div>

      {/* Mapa */}
      <div className="map-canvas">
        <div id="map" ref={mapRef} role="application" aria-label={t.map.title} />
        <div className={`map-status ${online ? "live" : "offline"}`} role="status">
          {online ? `● ${t.map.live}` : t.map.offline}
        </div>
      </div>

      {/* Lista de necesidades (scroll interno en PC) */}
      <div className="map-list">
        <NeedList needs={listNeeds} embedded />
        {delivered !== null && delivered > 0 && (
          <p className="impact" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            <CheckCircle2 size={16} aria-hidden="true" /> {delivered} {t.common.deliveredCount}
          </p>
        )}
      </div>
    </div>
  );
}
