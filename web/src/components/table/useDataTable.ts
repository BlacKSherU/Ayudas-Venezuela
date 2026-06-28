import { useState, useMemo, useCallback } from "react";

// Port del hook useAdminTable de VivaPlayer: búsqueda + filtros + orden + paginación, en cliente.
// UI-agnóstico (sin dependencias), reutilizable por el DataTable.

export type SortDir = "asc" | "desc" | null;

export interface SortState {
  key: string;
  dir: SortDir;
}

export interface UseDataTableOptions<T> {
  data: T[];
  searchKeys?: string[];
  defaultPageSize?: number;
  /** Coincidencia personalizada por filtro (por defecto: igualdad exacta sobre row[key]). */
  filterMatchers?: Record<string, (item: T, filterValue: string) => boolean>;
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | null | undefined)?.[k], obj);
}

export function useDataTable<T extends Record<string, unknown>>({
  data,
  searchKeys = [],
  defaultPageSize = 10,
  filterMatchers,
}: UseDataTableOptions<T>) {
  const [search, setSearchRaw] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "", dir: null });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: null };
    });
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const filtered = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((k) => {
          const val = getNestedValue(item, k);
          return val != null && String(val).toLowerCase().includes(q);
        }),
      );
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "__all__") {
        const matcher = filterMatchers?.[key];
        result = result.filter((item) => {
          if (matcher) return matcher(item, value);
          return String(getNestedValue(item, key)) === value;
        });
      }
    });

    if (sort.key && sort.dir) {
      result.sort((a, b) => {
        const va = getNestedValue(a, sort.key);
        const vb = getNestedValue(b, sort.key);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, search, searchKeys, filters, sort, filterMatchers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return {
    search,
    setSearch: (v: string) => {
      setSearchRaw(v);
      setPage(1);
    },
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: (v: number) => {
      setPageSizeRaw(v);
      setPage(1);
    },
    totalPages,
    totalItems: filtered.length,
    filters,
    setFilter,
    paged,
    filtered,
  };
}
