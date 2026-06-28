import { UNITS_BY_DIMENSION } from "../lib/types";

/** Cantidad + unidad (compatible con la dimensión del producto). */
export function QuantityInput({
  dimension,
  qty,
  unit,
  onQty,
  onUnit,
}: {
  dimension: string;
  qty: number;
  unit: string;
  onQty: (q: number) => void;
  onUnit: (u: string) => void;
}) {
  const units = UNITS_BY_DIMENSION[dimension] ?? ["unidad"];
  return (
    <div style={{ display: "flex", gap: "0.5rem" }}>
      <input
        type="number"
        min={0}
        step="any"
        value={qty}
        onChange={(e) => onQty(Number(e.target.value))}
        aria-label="Cantidad"
        style={{ flex: 1 }}
      />
      <select value={unit} onChange={(e) => onUnit(e.target.value)} aria-label="Unidad" style={{ width: "auto" }}>
        {units.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}
