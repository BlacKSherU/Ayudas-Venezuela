import { Minus } from "lucide-react";
import { DataTable, type ColumnDef, type ActionDef } from "./table/DataTable";
import type { InventoryBalance } from "../lib/types";

// Tabla reutilizable de saldos de inventario. Si se pasa onDecrease, añade la acción "Baja".

type Row = InventoryBalance & Record<string, unknown>;

export function BalancesTable({
  balances,
  onDecrease,
}: {
  balances: InventoryBalance[];
  onDecrease?: (b: InventoryBalance) => void;
}) {
  const rows = balances as Row[];
  const columns: ColumnDef<Row>[] = [
    { key: "product.name", label: "Producto", sortable: true, render: (b) => b.product.name },
    {
      key: "qtyBase",
      label: "Cantidad",
      sortable: true,
      render: (b) => (
        <span>
          <strong>{b.qtyBase}</strong> {b.product.baseUnit}
        </span>
      ),
    },
    {
      key: "kind",
      label: "Tipo",
      sortable: true,
      render: (b) => (b.kind === "transito" ? "En tránsito" : "Disponible"),
    },
  ];

  const actions = onDecrease
    ? (b: Row): ActionDef<Row>[] =>
        b.kind === "personal"
          ? [{ label: "Dar de baja", icon: <Minus size={16} aria-hidden="true" />, variant: "destructive", onClick: () => onDecrease(b) }]
          : []
    : undefined;

  return (
    <DataTable<Row>
      columns={columns}
      data={rows}
      getRowId={(b) => b.product.id + b.kind}
      searchKeys={["product.name"]}
      searchPlaceholder="Buscar producto…"
      emptyText="Sin productos"
      filters={[
        {
          key: "kind",
          label: "Tipo",
          options: [
            { label: "Disponible", value: "personal" },
            { label: "En tránsito", value: "transito" },
          ],
        },
      ]}
      actions={actions}
      defaultPageSize={10}
    />
  );
}
