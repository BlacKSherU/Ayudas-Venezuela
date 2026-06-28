import { useEffect, useState, useCallback } from "react";
import { Eye, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { useSession, useCategories } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { DataTable, type ColumnDef } from "../components/table/DataTable";
import { DetailModal } from "../components/Modal";
import { formatDateTime } from "../lib/format";
import { t } from "../i18n";
import type { Need } from "../lib/types";

type Row = Need & { itemsText: string } & Record<string, unknown>;

/** Gestión de las publicaciones propias: listar, ver y eliminar (US1, FR-018). */
export function MyNeedsPage() {
  const { identityId, loading } = useSession();
  const categories = useCategories();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [fetching, setFetching] = useState(false);
  const [detail, setDetail] = useState<Row | null>(null);

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

  const rows: Row[] = needs.map((n) => ({
    ...n,
    itemsText: n.items.map((i) => label(i.categoryCode)).join(", "),
  }));

  const columns: ColumnDef<Row>[] = [
    {
      key: "urgency",
      label: "Urgencia",
      sortable: true,
      render: (n) => <span className={`badge ${n.urgency}`}>{t.urgency[n.urgency]}</span>,
    },
    { key: "itemsText", label: "Insumos", render: (n) => n.itemsText },
    { key: "status", label: "Estado", sortable: true, render: (n) => t.status[n.status] },
    { key: "regionCode", label: "Región", sortable: true, hideOnMobile: true },
    {
      key: "updatedAt",
      label: "Actualizado",
      sortable: true,
      hideOnMobile: true,
      render: (n) => formatDateTime(n.updatedAt),
    },
  ];

  return (
    <div className="container">
      <h2>{t.mine.title}</h2>
      <DataTable<Row>
        columns={columns}
        data={rows}
        getRowId={(n) => n.id}
        isLoading={fetching}
        searchKeys={["itemsText", "note", "status", "regionCode"]}
        searchPlaceholder="Buscar en mis publicaciones…"
        emptyText={t.mine.none}
        filters={[
          {
            key: "status",
            label: "Estado",
            options: [
              { label: "Pendiente", value: "pendiente" },
              { label: "En camino", value: "comprometida" },
              { label: "Entregada", value: "entregada" },
              { label: "Expirada", value: "expirada" },
            ],
          },
          {
            key: "urgency",
            label: "Urgencia",
            options: [
              { label: "Urgente", value: "alta" },
              { label: "Media", value: "media" },
              { label: "Baja", value: "baja" },
            ],
          },
        ]}
        actions={(n) => [
          { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, onClick: () => setDetail(n) },
          {
            label: t.mine.delete,
            icon: <Trash2 size={16} aria-hidden="true" />,
            variant: "destructive",
            separator: true,
            onClick: () => remove(n.id),
          },
        ]}
        mobileCard={(n) => (
          <div>
            <span className={`badge ${n.urgency}`}>{t.urgency[n.urgency]}</span>{" "}
            <span className="muted">{t.status[n.status]}</span>
            <div>{n.itemsText}</div>
            {n.note && <div className="muted">{n.note}</div>}
          </div>
        )}
      />

      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de la publicación"
        fields={
          detail
            ? [
                { label: "Urgencia", value: t.urgency[detail.urgency] },
                { label: "Estado", value: t.status[detail.status] },
                { label: "Insumos", value: detail.itemsText },
                { label: "Nota", value: detail.note ?? "—" },
                { label: "Contacto público", value: detail.contactPublic ?? "—" },
                { label: "Región", value: detail.regionCode },
                { label: "Actualizado", value: formatDateTime(detail.updatedAt) },
              ]
            : []
        }
      />
    </div>
  );
}
