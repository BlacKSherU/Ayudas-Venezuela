import { useEffect, useState } from "react";
import { Search, Plus } from "lucide-react";
import { api } from "../lib/api";
import type { Product } from "../lib/types";

/**
 * Selector con buscador del catálogo común de productos. Permite elegir uno existente o crear
 * uno nuevo (que se deduplica en el servidor). `category` acota la búsqueda y precarga la
 * categoría del producto nuevo.
 */
export function ProductPicker({
  categoryCode,
  onPick,
}: {
  categoryCode?: string;
  onPick: (product: Product) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    const id = setTimeout(() => {
      api
        .searchProducts(q, categoryCode)
        .then((r) => active && setResults(r.products))
        .catch(() => active && setResults([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [query, categoryCode]);

  async function createNew() {
    if (!categoryCode) return;
    setBusy(true);
    try {
      // Dimensión/unidad por defecto: conteo/unidad (ajustable luego). El servidor deduplica.
      const product = await api.createProduct({
        name: query.trim(),
        categoryCode,
        dimension: "conteo",
        baseUnit: "unidad",
      });
      onPick(product);
      setQuery("");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  const exact = results.some((p) => p.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div>
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          aria-hidden="true"
          style={{ position: "absolute", left: 10, top: 13, color: "#5a5a5a" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto (ej. arroz)…"
          aria-label="Buscar producto"
          style={{ paddingLeft: "2rem" }}
        />
      </div>
      {(results.length > 0 || (query.trim().length >= 2 && categoryCode)) && (
        <ul style={{ listStyle: "none", margin: "0.25rem 0 0", padding: 0 }}>
          {results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="chip"
                style={{ width: "100%", textAlign: "left", margin: "0.15rem 0" }}
                onClick={() => {
                  onPick(p);
                  setQuery("");
                  setResults([]);
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
          {!exact && categoryCode && query.trim().length >= 2 && (
            <li>
              <button
                type="button"
                className="chip"
                style={{ width: "100%", textAlign: "left", margin: "0.15rem 0" }}
                disabled={busy}
                onClick={createNew}
              >
                <Plus size={14} aria-hidden="true" /> Agregar "{query.trim()}"
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
