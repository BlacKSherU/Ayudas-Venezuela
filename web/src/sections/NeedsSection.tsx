import { useState } from "react";
import { PlusCircle, ListChecks, Boxes } from "lucide-react";
import { PublishPage } from "../pages/PublishPage";
import { MyNeedsPage } from "../pages/MyNeedsPage";
import { InventoryPage } from "../pages/InventoryPage";
import { goTo } from "../App";

type View = "publicar" | "mis" | "inventario";

const TABS: { key: View; label: string; Icon: typeof PlusCircle }[] = [
  { key: "publicar", label: "Publicar", Icon: PlusCircle },
  { key: "mis", label: "Mis avisos", Icon: ListChecks },
  { key: "inventario", label: "Inventario", Icon: Boxes },
];

/** Sección Necesitados (feature 4, US5): publicar, gestionar publicaciones e inventario. */
export function NeedsSection({ view }: { view?: string }) {
  const initial: View =
    view === "mis" || view === "inventario" ? view : "publicar";
  const [tab, setTab] = useState<View>(initial);

  return (
    <div>
      <div className="subnav" role="tablist" aria-label="Vistas de necesitados">
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
      {tab === "publicar" && <PublishPage onPublished={() => goTo("mapa")} />}
      {tab === "mis" && <MyNeedsPage />}
      {tab === "inventario" && <InventoryPage />}
    </div>
  );
}
