import { useState } from "react";
import { Eye } from "lucide-react";
import { useCategories } from "../App";
import { DataTable, type ColumnDef } from "./table/DataTable";
import { DetailModal } from "./Modal";
import { api } from "../lib/api";
import { orderStatusLabel } from "../lib/orderStatus";
import { formatDateTime } from "../lib/format";
import type { Order } from "../lib/types";

function evidenceLink(key: string | null) {
  return key ? (
    <a href={api.mediaUrl(key)} target="_blank" rel="noreferrer">
      Ver foto
    </a>
  ) : (
    "—"
  );
}

type Row = Order & { itemsText: string; code: string | null } & Record<string, unknown>;

/**
 * Tabla de seguimiento de órdenes (feature 4). La usa el donante (código de recogida) y el
 * necesitado (código de entrega): muestra insumos, estado, su código persistente y la fecha,
 * con "Ver" → modal de detalle.
 */
export function OrdersTrackingTable({
  orders,
  codeFor,
  codeLabel,
  emptyText,
  isLoading,
}: {
  orders: Order[];
  codeFor: (o: Order) => string | null;
  codeLabel: string;
  emptyText: string;
  isLoading?: boolean;
}) {
  const categories = useCategories();
  const label = (c: string) => categories.find((x) => x.code === c)?.labelEs ?? c;
  const [detail, setDetail] = useState<Row | null>(null);

  const rows: Row[] = orders.map((o) => ({
    ...o,
    itemsText: o.items.map((i) => label(i.categoryCode)).join(", "),
    code: codeFor(o),
  }));

  const columns: ColumnDef<Row>[] = [
    { key: "itemsText", label: "Insumos", render: (o) => o.itemsText },
    { key: "status", label: "Estado", sortable: true, render: (o) => orderStatusLabel(o.status) },
    {
      key: "code",
      label: codeLabel,
      render: (o) =>
        o.code ? (
          <strong style={{ letterSpacing: "1px" }}>{o.code}</strong>
        ) : (
          <span className="muted">—</span>
        ),
    },
    {
      key: "updatedAt",
      label: "Actualizada",
      sortable: true,
      hideOnMobile: true,
      render: (o) => formatDateTime(o.updatedAt),
    },
  ];

  return (
    <>
      <DataTable<Row>
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        isLoading={isLoading}
        searchKeys={["itemsText", "status", "regionCode"]}
        searchPlaceholder="Buscar orden…"
        emptyText={emptyText}
        actions={(o) => [
          { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, onClick: () => setDetail(o) },
        ]}
        mobileCard={(o) => (
          <div>
            <strong>{o.itemsText}</strong>
            <div className="muted">
              {orderStatusLabel(o.status)}
              {o.code ? ` · ${codeLabel}: ${o.code}` : ""}
            </div>
          </div>
        )}
      />
      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de la orden"
        fields={
          detail
            ? [
                { label: "Insumos", value: detail.itemsText },
                { label: "Estado", value: orderStatusLabel(detail.status) },
                { label: codeLabel, value: detail.code ?? "—" },
                { label: "Evidencia de donación", value: evidenceLink(detail.donationEvidence) },
                { label: "Evidencia de recogida", value: evidenceLink(detail.pickupEvidence) },
                { label: "Evidencia de entrega", value: evidenceLink(detail.deliveryEvidence) },
                { label: "Región", value: detail.regionCode },
                { label: "Actualizada", value: formatDateTime(detail.updatedAt) },
              ]
            : []
        }
      />
    </>
  );
}
