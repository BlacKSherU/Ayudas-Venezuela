import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useSession, useCategories } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { t } from "../i18n";
import type { Need } from "../lib/types";

/** Gestión de las publicaciones propias: listar y eliminar (US1, FR-018). */
export function MyNeedsPage() {
  const { identityId, loading } = useSession();
  const categories = useCategories();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [fetching, setFetching] = useState(false);

  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const r = await api.myNeeds();
      setNeeds(r.needs);
    } catch {
      setNeeds([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (identityId) void load();
  }, [identityId, load]);

  async function remove(id: string) {
    if (!window.confirm(t.mine.confirmDelete)) return;
    await api.deleteNeed(id);
    setNeeds((prev) => prev.filter((n) => n.id !== id));
  }

  if (loading) return <div className="container">{t.common.loading}</div>;
  if (!identityId) return <LoginPrompt action="ver tus publicaciones" />;

  return (
    <div className="container">
      <h2>{t.mine.title}</h2>
      {fetching && <p className="muted">{t.common.loading}</p>}
      {!fetching && needs.length === 0 && <p className="muted">{t.mine.none}</p>}
      {needs.map((n) => (
        <div className="card" key={n.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className={`badge ${n.urgency}`}>{t.urgency[n.urgency]}</span>
            <span className="muted">{t.status[n.status]}</span>
          </div>
          <p style={{ margin: "0.5rem 0 0.25rem" }}>
            {n.items.map((i) => label(i.categoryCode)).join(", ")}
          </p>
          {n.note && <p className="muted">{n.note}</p>}
          {n.contactPublic && (
            <p className="muted">
              {t.common.contactLabel} {n.contactPublic}
            </p>
          )}
          <div style={{ marginTop: "0.5rem" }}>
            <button className="btn danger" onClick={() => remove(n.id)}>
              {t.mine.delete}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
