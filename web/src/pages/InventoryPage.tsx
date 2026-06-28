import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useSession } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { ProductPicker } from "../components/ProductPicker";
import { QuantityInput } from "../components/QuantityInput";
import { BalancesTable } from "../components/BalancesTable";
import { MovementsTable } from "../components/MovementsTable";
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
  if (!identityId) return <LoginPrompt action="ver tu inventario" />;

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
      <BalancesTable balances={balances} onDecrease={decrease} />

      <h3 style={{ fontSize: "1rem", marginTop: "1.5rem" }}>Libro de movimientos</h3>
      <MovementsTable movements={movements} />
    </div>
  );
}
