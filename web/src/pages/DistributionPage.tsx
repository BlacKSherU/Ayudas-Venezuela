import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Dist {
  byProduct: { product: { id: string; name: string; baseUnit: string }; supplyBase: number; demandCount: number }[];
  unmetByRegion: { regionCode: string; demandUnmet: number }[];
}

export function DistributionPage() {
  const [dist, setDist] = useState<Dist | null>(null);

  useEffect(() => {
    api.distribution().then(setDist).catch(() => setDist(null));
  }, []);

  if (!dist) return <div className="container">Cargando…</div>;

  return (
    <div className="container">
      <h2>Distribución de insumos</h2>
      <p className="muted">Vista pública: oferta disponible vs demanda, y dónde hace más falta.</p>

      <h3 style={{ fontSize: "1rem" }}>Por producto</h3>
      {dist.byProduct.length === 0 && <p className="muted">Aún no hay datos.</p>}
      {dist.byProduct.map((b) => (
        <div className="card" key={b.product.id} style={{ display: "flex", justifyContent: "space-between" }}>
          <span>{b.product.name}</span>
          <span className="muted">
            oferta: {b.supplyBase} {b.product.baseUnit} · demanda: {b.demandCount}
          </span>
        </div>
      ))}

      <h3 style={{ fontSize: "1rem" }}>A dónde distribuir (mayor demanda no cubierta)</h3>
      {dist.unmetByRegion.length === 0 && <p className="muted">Sin necesidades pendientes.</p>}
      <ol>
        {dist.unmetByRegion.map((r) => (
          <li key={r.regionCode}>
            <strong>{r.regionCode}</strong> — {r.demandUnmet} necesidades pendientes
          </li>
        ))}
      </ol>
    </div>
  );
}
