import { useCallback, useEffect, useState } from "react";
import { Gift, Warehouse, Boxes, MapPin, Pencil, Trash2 } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useSession } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { CenterForm } from "../components/centers/CenterForm";
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
function MyCentersPanel() {
  const { identityId, loading } = useSession();
  const [centers, setCenters] = useState<MyCenter[]>([]);
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<MyCenter | null>(null);
  const [creating, setCreating] = useState(false);

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
      <button className="btn" onClick={() => setCreating(true)}>
        + Registrar un centro
      </button>

      {busy ? (
        <p className="muted">Cargando…</p>
      ) : centers.length === 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          Aún no tienes centros registrados.
        </p>
      ) : (
        <div style={{ marginTop: "1rem" }}>
          {centers.map((c) => (
            <div className="card" key={c.id}>
              <strong>{c.name}</strong>
              {c.status === "oculto" && (
                <span className="badge alta" style={{ marginLeft: "0.5rem" }}>
                  oculto por reportes
                </span>
              )}
              <div className="muted" style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <MapPin size={14} aria-hidden="true" /> {c.location.lat.toFixed(4)}, {c.location.lng.toFixed(4)}
              </div>
              {c.note && <div className="muted">{c.note}</div>}
              <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
                <button className="btn secondary" onClick={() => setEditing(c)}>
                  <Pencil size={14} aria-hidden="true" /> Editar
                </button>
                <button className="btn secondary" onClick={() => remove(c.id)}>
                  <Trash2 size={14} aria-hidden="true" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
