import { useEffect, useState } from "react";
import { PlusCircle, ListChecks, Boxes, Truck } from "lucide-react";
import { PublishPage } from "../pages/PublishPage";
import { MyNeedsPage } from "../pages/MyNeedsPage";
import { InventoryPage } from "../pages/InventoryPage";
import { LoginPrompt } from "../components/LoginPrompt";
import { OrdersTrackingTable } from "../components/OrdersTrackingTable";
import { api } from "../lib/api";
import { useSession, goTo } from "../App";
import type { Order } from "../lib/types";

type View = "publicar" | "mis" | "entregas" | "inventario";

const TABS: { key: View; label: string; Icon: typeof PlusCircle }[] = [
  { key: "publicar", label: "Publicar", Icon: PlusCircle },
  { key: "mis", label: "Mis avisos", Icon: ListChecks },
  { key: "entregas", label: "Entregas", Icon: Truck },
  { key: "inventario", label: "Inventario", Icon: Boxes },
];

/** Sección Necesitados (feature 4, US5): publicar, gestionar, seguir entregas e inventario. */
export function NeedsSection({ view }: { view?: string }) {
  const initial: View =
    view === "mis" || view === "inventario" || view === "entregas" ? view : "publicar";
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
      {tab === "entregas" && <IncomingDeliveriesPanel />}
      {tab === "inventario" && <InventoryPage />}
    </div>
  );
}

/** Seguimiento de las entregas hacia mis necesidades (con el código de entrega). */
function IncomingDeliveriesPanel() {
  const { identityId, loading } = useSession();
  const [orders, setOrders] = useState<(Order & { dropoffCode: string | null })[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!identityId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    api
      .incomingOrders()
      .then((r) => setOrders(r.orders))
      .catch(() => setOrders([]))
      .finally(() => setBusy(false));
  }, [identityId]);

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId) return <LoginPrompt action="ver tus entregas" />;

  return (
    <div className="container wide">
      <h2>Entregas hacia mis necesidades</h2>
      <p className="muted">
        Estado de las donaciones que van hacia ti. Guarda el <strong>código de entrega</strong>:
        se lo das al repartilor cuando reciba la ayuda.
      </p>
      <OrdersTrackingTable
        orders={orders}
        codeFor={(o) => (o as Order & { dropoffCode: string | null }).dropoffCode}
        codeLabel="Código de entrega"
        emptyText="Aún no hay entregas hacia tus necesidades"
        isLoading={busy}
      />
    </div>
  );
}
