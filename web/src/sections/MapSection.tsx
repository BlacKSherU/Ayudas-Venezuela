import { useState } from "react";
import { Map as MapIcon, BarChart3, ScrollText } from "lucide-react";
import { MapPage } from "../pages/MapPage";
import { DistributionPage } from "../pages/DistributionPage";
import { PublicLedgerPage } from "../pages/PublicLedgerPage";

type View = "mapa" | "distribucion" | "transparencia";

const TABS: { key: View; label: string; Icon: typeof MapIcon }[] = [
  { key: "mapa", label: "Mapa", Icon: MapIcon },
  { key: "distribucion", label: "Distribución", Icon: BarChart3 },
  { key: "transparencia", label: "Transparencia", Icon: ScrollText },
];

/**
 * Sección Mapa (feature 4, US2): el mapa principal en tiempo real, con sub-vistas públicas de
 * Distribución y Transparencia (libro público) integradas aquí para mantener limpias las 4
 * secciones principales.
 */
export function MapSection({ view }: { view?: string }) {
  const initial: View =
    view === "distribucion" || view === "transparencia" ? view : "mapa";
  const [tab, setTab] = useState<View>(initial);

  return (
    <div className={tab === "mapa" ? "map-section-fill" : ""}>
      <div className="subnav" role="tablist" aria-label="Vistas del mapa">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className="subnav-tab"
            onClick={() => setTab(key)}
          >
            <Icon size={16} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {tab === "mapa" && <MapPage />}
      {tab === "distribucion" && <DistributionPage />}
      {tab === "transparencia" && <PublicLedgerPage />}
    </div>
  );
}
