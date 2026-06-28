import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { DataTable, type ColumnDef } from "../components/table/DataTable";

interface ByProduct {
  product: { id: string; name: string; baseUnit: string };
  supplyBase: number;
  demandCount: number;
}
interface ByRegion {
  regionCode: string;
  demandUnmet: number;
}
interface Dist {
  byProduct: ByProduct[];
  unmetByRegion: ByRegion[];
}

type ProductRow = ByProduct & Record<string, unknown>;
type RegionRow = ByRegion & Record<string, unknown>;

export function DistributionPage() {
  const [dist, setDist] = useState<Dist | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .distribution()
      .then((d) => {
        setDist(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, []);

  const productColumns: ColumnDef<ProductRow>[] = [
    { key: "product.name", label: "Producto", sortable: true, render: (b) => b.product.name },
    {
      key: "supplyBase",
      label: "Oferta",
      sortable: true,
      render: (b) => `${b.supplyBase} ${b.product.baseUnit}`,
    },
    { key: "demandCount", label: "Demanda", sortable: true, render: (b) => b.demandCount },
  ];

  const regionColumns: ColumnDef<RegionRow>[] = [
    { key: "regionCode", label: "Región", sortable: true },
    {
      key: "demandUnmet",
      label: "Necesidades pendientes",
      sortable: true,
      render: (r) => r.demandUnmet,
    },
  ];

  return (
    <div className="container wide">
      <h2>Distribución de insumos</h2>
      <p className="muted">Vista pública: oferta disponible vs demanda, y dónde hace más falta.</p>

      <div className="dist-grid">
        <section>
          <h3 style={{ fontSize: "1rem" }}>Por producto</h3>
          <DataTable<ProductRow>
            columns={productColumns}
            data={(dist?.byProduct ?? []) as ProductRow[]}
            getRowId={(b) => b.product.id}
            searchKeys={["product.name"]}
            searchPlaceholder="Buscar producto…"
            isLoading={!dist && !error}
            isError={error}
            onRetry={() => api.distribution().then(setDist).catch(() => setError(true))}
            emptyText="Aún no hay datos"
            defaultPageSize={10}
          />
        </section>

        <section>
          <h3 style={{ fontSize: "1rem" }}>A dónde distribuir (mayor demanda no cubierta)</h3>
          <DataTable<RegionRow>
            columns={regionColumns}
            data={(dist?.unmetByRegion ?? []) as RegionRow[]}
            getRowId={(r) => r.regionCode}
            searchKeys={["regionCode"]}
            searchPlaceholder="Buscar región…"
            isLoading={!dist && !error}
            isError={error}
            emptyText="Sin necesidades pendientes"
            defaultPageSize={10}
          />
        </section>
      </div>
    </div>
  );
}
