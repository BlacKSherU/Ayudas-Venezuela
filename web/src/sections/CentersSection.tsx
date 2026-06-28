import { useCallback, useEffect, useState } from "react";
import { Gift, Warehouse, Boxes, Eye, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { CenterForm } from "../components/centers/CenterForm";
import { DataTable, type ColumnDef } from "../components/table/DataTable";
import { DetailModal } from "../components/Modal";
import { DonatePage } from "../pages/DonatePage";
import { InventoryPage } from "../pages/InventoryPage";
import type { MyCenter } from "../lib/types";

type View = "donar" | "centros" | "inventario";

const TABS: { key: View; label: string; Icon: typeof Gift }[] = [
  { key: "donar", label: "Donar", Icon: Gift },
  { key: "centros", label: "Mis centros", Icon: Warehouse },
  { key: "inventario", label: "Inventario", Icon: Boxes },
];

/** Sección Centros de acopio (feature 4, US4): donar, gestionar centros propios e inventario. */
export function CentersSection({ view }: { view?: string }) {
  const initial: View = view === "centros" || view === "inventario" ? view : "donar";
  const [tab, setTab] = useState<View>(initial);

  return (
    <div>
      <div className="subnav" role="tablist" aria-label="Vistas de centros de acopio">
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
      {tab === "donar" && <DonatePage />}
      {tab === "centros" && <MyCentersPanel />}
      {tab === "inventario" && <InventoryPage />}
    </div>
  );
}

/** Gestión de los centros de acopio del usuario (registrar/editar/eliminar). */
type CenterRow = MyCenter & Record<string, unknown>;

function MyCentersPanel() {
  const { identityId, loading } = useSession();
  const [centers, setCenters] = useState<MyCenter[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<MyCenter | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<MyCenter | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await api.myCenters();
      setCenters(r.centers);
    } catch {
      setCenters([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (identityId) void load();
    else setBusy(false);
  }, [identityId, load]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este centro de acopio?")) return;
    try {
      await api.deleteCenter(id);
      void load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "No se pudo eliminar");
    }
  }

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId) return <LoginPrompt action="registrar un centro de acopio" />;

  if (creating)
    return (
      <div className="container">
        <CenterForm
          onSaved={() => {
            setCreating(false);
            void load();
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    );

  if (editing)
    return (
      <div className="container">
        <CenterForm
          existing={editing}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );

  return (
    <div className="container">
      <h2>Mis centros de acopio</h2>
      <p className="muted">
        Un centro de acopio es un punto público donde recibes o despachas donaciones. Aparecerá
        en el mapa con su ubicación exacta. Registrarlo es opcional.
      </p>
      <div style={{ marginTop: "1rem" }}>
        <DataTable<CenterRow>
          columns={centerColumns}
          data={centers as CenterRow[]}
          getRowId={(c) => c.id}
          isLoading={busy}
          searchKeys={["name", "note", "regionCode"]}
          searchPlaceholder="Buscar centro…"
          emptyText="Aún no tienes centros registrados"
          filters={[
            {
              key: "status",
              label: "Estado",
              options: [
                { label: "Activo", value: "activo" },
                { label: "Oculto", value: "oculto" },
              ],
            },
          ]}
          actions={(c) => [
            { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, onClick: () => setDetail(c) },
            { label: "Editar", icon: <Pencil size={16} aria-hidden="true" />, onClick: () => setEditing(c) },
            {
              label: "Eliminar",
              icon: <Trash2 size={16} aria-hidden="true" />,
              variant: "destructive",
              separator: true,
              onClick: () => remove(c.id),
            },
          ]}
          mobileCard={(c) => (
            <div>
              <strong>{c.name}</strong>
              {c.status === "oculto" && <span className="badge alta" style={{ marginLeft: "0.5rem" }}>oculto</span>}
              <div className="muted">
                {c.location.lat.toFixed(4)}, {c.location.lng.toFixed(4)}
              </div>
              {c.note && <div className="muted">{c.note}</div>}
            </div>
          )}
        />
      </div>

      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle del centro de acopio"
        fields={
          detail
            ? [
                { label: "Nombre", value: detail.name },
                { label: "Estado", value: detail.status === "oculto" ? "Oculto por reportes" : "Activo" },
                { label: "Ubicación", value: `${detail.location.lat.toFixed(5)}, ${detail.location.lng.toFixed(5)}` },
                { label: "Región", value: detail.regionCode },
                { label: "Nota", value: detail.note ?? "—" },
                { label: "Reportes", value: String(detail.reportsCount) },
              ]
            : []
        }
      />
    </div>
  );
}

const centerColumns: ColumnDef<CenterRow>[] = [
  { key: "name", label: "Nombre", sortable: true },
  {
    key: "status",
    label: "Estado",
    sortable: true,
    render: (c) =>
      c.status === "oculto" ? <span className="badge alta">Oculto</span> : <span className="badge baja">Activo</span>,
  },
  {
    key: "location",
    label: "Ubicación",
    hideOnMobile: true,
    render: (c) => `${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}`,
  },
  { key: "note", label: "Nota", hideOnMobile: true, render: (c) => c.note ?? "—" },
];
