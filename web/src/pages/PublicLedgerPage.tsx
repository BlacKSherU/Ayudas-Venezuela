import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { MOVEMENT_LABEL } from "../lib/movements";
import type { InventoryBalance, LedgerMovement } from "../lib/types";

/** Lee el ref del hash: #/ledger?ref=xxxx */
function refFromHash(): string | null {
  const q = window.location.hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get("ref");
}

/** Vista pública del inventario y libro de movimientos de cualquier usuario (US3). */
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

  if (!ref)
    return (
      <div className="container">
        <h2>Transparencia pública</h2>
        <p className="muted">
          Todos los inventarios y movimientos son públicos. Llega aquí desde un enlace de un
          movimiento o desde la vista de Distribución.
        </p>
      </div>
    );

  if (notFound)
    return (
      <div className="container">
        <p className="muted">No se encontró ese inventario.</p>
      </div>
    );

  return (
    <div className="container">
      <h2>Inventario público de {owner}</h2>
      <p className="muted">Registro público e imborrable (auditoría abierta).</p>

      <h3 style={{ fontSize: "1rem" }}>Saldos</h3>
      {balances.length === 0 && <p className="muted">Sin productos.</p>}
      {balances.map((b) => (
        <div className="card" key={b.product.id + b.kind}>
          {b.product.name} — <strong>{b.qtyBase}</strong> {b.product.baseUnit}
          {b.kind === "transito" && <span className="muted"> (en tránsito)</span>}
        </div>
      ))}

      <h3 style={{ fontSize: "1rem" }}>Libro de movimientos</h3>
      <ul style={{ listStyle: "none", padding: 0 }} aria-label="Movimientos">
        {movements.map((m) => (
          <li className="card" key={m.id}>
            <strong>{MOVEMENT_LABEL[m.type] ?? m.type}</strong> · {m.product.name} ·{" "}
            {m.direction === "in" ? "+" : "−"}
            {m.declaredQty} {m.declaredUnit}
            {m.reason && <span className="muted"> ({m.reason})</span>}
            {m.counterparty && (
              <>
                {" · "}
                <a href={`#/ledger?ref=${m.counterparty.ref}`}>{m.counterparty.publicName}</a>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
