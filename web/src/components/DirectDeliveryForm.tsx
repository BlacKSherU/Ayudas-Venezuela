import { useState } from "react";
import { api, ApiError } from "../lib/api";
import { useCategories } from "../App";
import { ProductPicker } from "./ProductPicker";
import { QuantityInput } from "./QuantityInput";
import type { Product } from "../lib/types";

interface Line {
  product: Product;
  qty: number;
  unit: string;
}

/** Registra una entrega directa (en mano) donante→necesitado para una necesidad (US5). */
export function DirectDeliveryForm({ needId, onDone }: { needId: string; onDone: () => void }) {
  const categories = useCategories();
  const [cat, setCat] = useState("");
  const [picked, setPicked] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("unidad");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addLine() {
    if (!picked) return;
    setLines((prev) => [...prev, { product: picked, qty, unit }]);
    setPicked(null);
    setQty(1);
  }

  async function submit() {
    if (lines.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await api.directDelivery(
        needId,
        lines.map((l) => ({ productId: l.product.id, declaredQty: l.qty, declaredUnit: l.unit })),
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar la entrega");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="muted">Registra lo que entregaste en mano. Queda en el libro público.</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <label>Categoría</label>
      <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría">
        <option value="">Elige categoría…</option>
        {categories.map((c) => (
          <option key={c.code} value={c.code}>
            {c.labelEs}
          </option>
        ))}
      </select>
      {cat && !picked && (
        <div style={{ marginTop: "0.5rem" }}>
          <ProductPicker
            categoryCode={cat}
            onPick={(p) => {
              setPicked(p);
              setUnit(p.baseUnit);
            }}
          />
        </div>
      )}
      {picked && (
        <div style={{ marginTop: "0.5rem" }}>
          <strong>{picked.name}</strong>
          <QuantityInput dimension={picked.dimension} qty={qty} unit={unit} onQty={setQty} onUnit={setUnit} />
          <button className="btn secondary" style={{ marginTop: "0.5rem" }} onClick={addLine}>
            Añadir
          </button>
        </div>
      )}
      {lines.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: "0.5rem" }}>
          {lines.map((l, i) => (
            <li key={i} className="card">
              {l.product.name} — {l.qty} {l.unit}
            </li>
          ))}
        </ul>
      )}
      <button className="btn" disabled={busy || lines.length === 0} onClick={submit} style={{ marginTop: "0.5rem" }}>
        {busy ? "Registrando…" : "Registrar entrega directa"}
      </button>
    </div>
  );
}
