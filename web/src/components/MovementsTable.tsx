import { useState } from "react";
import { Eye } from "lucide-react";
import { DataTable, type ColumnDef } from "./table/DataTable";
import { DetailModal } from "./Modal";
import { MOVEMENT_LABEL } from "../lib/movements";
import { formatDateTime } from "../lib/format";
import type { LedgerMovement } from "../lib/types";

// Tabla reutilizable del libro de movimientos (Transparencia e Inventario), con búsqueda,
// filtros, orden, paginación y acción "Ver" → modal de detalle.

type Row = LedgerMovement & Record<string, unknown>;

export function MovementsTable({ movements }: { movements: LedgerMovement[] }) {
  const [detail, setDetail] = useState<LedgerMovement | null>(null);
  const rows = movements as Row[];

  const columns: ColumnDef<Row>[] = [
    { key: "type", label: "Tipo", sortable: true, render: (m) => MOVEMENT_LABEL[m.type] ?? m.type },
    { key: "product.name", label: "Producto", sortable: true, render: (m) => m.product.name },
    {
      key: "qtyBase",
      label: "Cantidad",
      sortable: true,
      render: (m) => (
        <span style={{ color: m.direction === "in" ? "var(--green-dark)" : "var(--red)" }}>
          {m.direction === "in" ? "+" : "−"}
          {m.declaredQty} {m.declaredUnit}
        </span>
      ),
    },
    {
      key: "counterparty",
      label: "Contraparte",
      hideOnMobile: true,
      render: (m) =>
        m.counterparty ? (
          <a href={`#/mapa?view=transparencia&ref=${m.counterparty.ref}`}>
            {m.counterparty.publicName}
          </a>
        ) : (
          <span className="muted">—</span>
        ),
    },
    { key: "at", label: "Fecha", sortable: true, hideOnMobile: true, render: (m) => formatDateTime(m.at) },
  ];

  return (
    <>
      <DataTable<Row>
        columns={columns}
        data={rows}
        getRowId={(m) => m.id}
        searchKeys={["type", "product.name", "reason", "declaredUnit"]}
        searchPlaceholder="Buscar movimiento…"
        emptyText="Sin movimientos"
        actions={(m) => [
          { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, onClick: () => setDetail(m) },
        ]}
        mobileCard={(m) => (
          <div>
            <strong>{MOVEMENT_LABEL[m.type] ?? m.type}</strong> · {m.product.name}
            <div className="muted">
              {m.direction === "in" ? "+" : "−"}
              {m.declaredQty} {m.declaredUnit} · {formatDateTime(m.at)}
            </div>
          </div>
        )}
        defaultPageSize={10}
      />

      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle del movimiento"
        fields={
          detail
            ? [
                { label: "Tipo", value: MOVEMENT_LABEL[detail.type] ?? detail.type },
                { label: "Producto", value: detail.product.name },
                {
                  label: "Cantidad",
                  value: `${detail.direction === "in" ? "+" : "−"}${detail.declaredQty} ${detail.declaredUnit}`,
                },
                { label: "Motivo", value: detail.reason ?? "—" },
                {
                  label: "Contraparte",
                  value: detail.counterparty ? (
                    <a href={`#/mapa?view=transparencia&ref=${detail.counterparty.ref}`}>
                      {detail.counterparty.publicName}
                    </a>
                  ) : (
                    "—"
                  ),
                },
                { label: "Orden", value: detail.orderId ?? "—" },
                { label: "Fecha", value: formatDateTime(detail.at) },
              ]
            : []
        }
      />
    </>
  );
}
