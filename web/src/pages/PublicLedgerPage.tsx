import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { api } from "../lib/api";
import { BalancesTable } from "../components/BalancesTable";
import { MovementsTable } from "../components/MovementsTable";
import { DataTable, type ColumnDef } from "../components/table/DataTable";
import { DetailModal } from "../components/Modal";
import { MOVEMENT_LABEL } from "../lib/movements";
import { formatDateTime } from "../lib/format";
import type { GlobalMovement, InventoryBalance, LedgerMovement } from "../lib/types";

/** Lee el ref del hash: #/mapa?view=transparencia&ref=xxxx */
function refFromHash(): string | null {
  const q = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get("ref");
}

/** Vista pública del inventario y libro de movimientos (US3 + feed global, feature 4). */
export function PublicLedgerPage() {
  const [ref, setRef] = useState<string | null>(refFromHash());
  const [owner, setOwner] = useState<string>("");
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const onHash = () => setRef(refFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!ref) return;
    setNotFound(false);
    Promise.all([api.getInventory(ref), api.getLedger(ref)])
      .then(([inv, led]) => {
        setOwner(inv.owner.publicName);
        setBalances(inv.balances);
        setMovements(led.movements);
      })
      .catch(() => setNotFound(true));
  }, [ref]);

  // Sin ref: feed público global de todos los movimientos.
  if (!ref) return <GlobalFeed />;

  if (notFound)
    return (
      <div className="container">
        <p className="muted">No se encontró ese inventario.</p>
      </div>
    );

  return (
    <div className="container wide">
      <h2>Inventario público de {owner}</h2>
      <p className="muted">Registro público e imborrable (auditoría abierta).</p>

      <div className="ledger-grid">
        <section>
          <h3 style={{ fontSize: "1rem" }}>Saldos</h3>
          <BalancesTable balances={balances} />
        </section>
        <section>
          <h3 style={{ fontSize: "1rem" }}>Libro de movimientos</h3>
          <MovementsTable movements={movements} />
        </section>
      </div>
    </div>
  );
}

type GRow = GlobalMovement & Record<string, unknown>;

/** Feed público global: movimientos recientes de toda la red. */
function GlobalFeed() {
  const [rows, setRows] = useState<GRow[] | null>(null);
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState<GlobalMovement | null>(null);

  const load = () => {
    setError(false);
    api
      .globalLedger(150)
      .then((r) => setRows(r.movements as GRow[]))
      .catch(() => setError(true));
  };
  useEffect(load, []);

  const columns: ColumnDef<GRow>[] = [
    {
      key: "owner.publicName",
      label: "Inventario",
      sortable: true,
      render: (m) => (
        <a href={`#/mapa?view=transparencia&ref=${m.owner.ref}`}>{m.owner.publicName}</a>
      ),
    },
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
    <div className="container wide">
      <h2>Transparencia pública</h2>
      <p className="muted">
        Todos los inventarios y movimientos son públicos. Aquí ves el registro de toda la red;
        toca un inventario para ver su detalle.
      </p>
      <DataTable<GRow>
        columns={columns}
        data={rows ?? []}
        getRowId={(m) => m.id}
        isLoading={rows === null && !error}
        isError={error}
        onRetry={load}
        searchKeys={["owner.publicName", "type", "product.name", "declaredUnit"]}
        searchPlaceholder="Buscar en la transparencia…"
        emptyText="Aún no hay movimientos públicos"
        actions={(m) => [
          { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, onClick: () => setDetail(m) },
        ]}
        mobileCard={(m) => (
          <div>
            <a href={`#/mapa?view=transparencia&ref=${m.owner.ref}`}>{m.owner.publicName}</a>{" "}
            · {MOVEMENT_LABEL[m.type] ?? m.type}
            <div className="muted">
              {m.product.name} · {m.direction === "in" ? "+" : "−"}
              {m.declaredQty} {m.declaredUnit} · {formatDateTime(m.at)}
            </div>
          </div>
        )}
        defaultPageSize={20}
      />

      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle del movimiento"
        fields={
          detail
            ? [
                { label: "Inventario", value: detail.owner.publicName },
                { label: "Tipo", value: MOVEMENT_LABEL[detail.type] ?? detail.type },
                { label: "Producto", value: detail.product.name },
                {
                  label: "Cantidad",
                  value: `${detail.direction === "in" ? "+" : "−"}${detail.declaredQty} ${detail.declaredUnit}`,
                },
                { label: "Motivo", value: detail.reason ?? "—" },
                { label: "Contraparte", value: detail.counterparty?.publicName ?? "—" },
                { label: "Fecha", value: formatDateTime(detail.at) },
              ]
            : []
        }
      />
    </div>
  );
}
