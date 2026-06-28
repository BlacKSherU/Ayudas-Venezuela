import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useSession } from "../App";
import { IdentityGate } from "../components/IdentityGate";
import { ProductPicker } from "../components/ProductPicker";
import { QuantityInput } from "../components/QuantityInput";
import { MOVEMENT_LABEL } from "../lib/movements";
import type { InventoryBalance, LedgerMovement, Product } from "../lib/types";

export function InventoryPage() {
  const { identityId, loading } = useSession();
  const [balances, setBalances] = useState<InventoryBalance[]>([]);
  const [movements, setMovements] = useState<LedgerMovement[]>([]);
  const [publicName, setPublicNameState] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("unidad");

  const load = useCallback(async () => {
    if (!identityId) return;
    const [inv, led] = await Promise.all([api.getInventory(identityId), api.getLedger(identityId)]);
    setBalances(inv.balances);
    setMovements(led.movements);
  }, [identityId]);

  useEffect(() => {
    if (identityId) void load();
  }, [identityId, load]);

  async function addItem() {
    if (!picked) return;
    await api.addInventoryItem(picked.id, qty, unit);
    setPicked(null);
    setQty(1);
    await load();
  }

  async function decrease(b: InventoryBalance) {
    const reason = window.prompt("Motivo: consumido / roto / extraviado / estropeado", "consumido");
    if (!reason) return;
    try {
      await api.decreaseInventoryItem(b.product.id, 1, b.product.baseUnit, reason.trim());
      await load();
    } catch {
      /* saldo insuficiente u otro error */
    }
  }

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId)
    return (
      <div className="container">
        <IdentityGate onAuthed={load} />
      </div>
    );

  return (
    <div className="container">
      <h2>Mi inventario</h2>
      <p className="muted">
        Tu inventario y sus movimientos son <strong>públicos</strong> (transparencia). Los
        registros no se borran.
      </p>

      <div className="card">
        <label>Nombre público (cómo te ven los demás)</label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input value={publicName} onChange={(e) => setPublicNameState(e.target.value)} placeholder="Real o seudónimo" />
          <button className="btn secondary" onClick={() => api.setPublicName(publicName || null)}>
            Guardar
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: "1rem" }}>Agregar producto</h3>
        {!picked ? (
          <ProductPicker onPick={(p) => { setPicked(p); setUnit(p.baseUnit); }} />
        ) : (
          <>
            <p>
              <strong>{picked.name}</strong>
            </p>
            <QuantityInput dimension={picked.dimension} qty={qty} unit={unit} onQty={setQty} onUnit={setUnit} />
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <button className="btn secondary" onClick={() => setPicked(null)}>Cambiar</button>
              <button className="btn" onClick={addItem}>Agregar al inventario</button>
            </div>
          </>
        )}
      </div>

      <h3 style={{ fontSize: "1rem" }}>Saldos</h3>
      {balances.length === 0 && <p className="muted">Aún no tienes productos.</p>}
      {balances.map((b) => (
        <div className="card" key={b.product.id + b.kind} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>
            {b.product.name} — <strong>{b.qtyBase}</strong> {b.product.baseUnit}
            {b.kind === "transito" && <span className="muted"> (en tránsito)</span>}
          </span>
          {b.kind === "personal" && (
            <button className="btn danger" onClick={() => decrease(b)}>Baja</button>
          )}
        </div>
      ))}

      <h3 style={{ fontSize: "1rem" }}>Libro de movimientos</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
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
