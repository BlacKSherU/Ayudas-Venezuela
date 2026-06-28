import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useDataTable, type SortDir } from "./useDataTable";
import { useIsMobile } from "../../hooks/useIsMobile";

// Port en CSS plano del AdminDataTable de VivaPlayer: misma API (ColumnDef/ActionDef/FilterDef)
// y mismas funciones (búsqueda, filtros, orden por columna, paginación con tamaño de página y
// números, acciones por fila con "Ver" → modal, tarjetas en móvil, estados de carga/vacío/error).

export interface ColumnDef<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  render?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

export interface ActionDef<T> {
  label: string;
  icon?: ReactNode;
  onClick: (item: T) => void;
  variant?: "default" | "destructive";
  separator?: boolean;
}

export interface FilterDef {
  key: string;
  label: string;
  options: { label: string; value: string }[];
  allLabel?: string;
}

interface DataTableProps<T> {
  title?: string;
  columns: ColumnDef<T>[];
  data: T[];
  getRowId: (item: T) => string | number;
  searchKeys?: string[];
  searchPlaceholder?: string;
  filters?: FilterDef[];
  actions?: (item: T) => ActionDef<T>[];
  onRowClick?: (item: T) => void;
  mobileCard?: (item: T) => ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyText?: string;
  onCreate?: () => void;
  createLabel?: string;
  defaultPageSize?: number;
}

function SortIcon({ dir }: { dir: SortDir }) {
  if (dir === "asc") return <ArrowUp size={14} aria-hidden="true" />;
  if (dir === "desc") return <ArrowDown size={14} aria-hidden="true" />;
  return <ArrowUpDown size={14} aria-hidden="true" style={{ opacity: 0.5 }} />;
}

function getNested(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((o, k) => (o as Record<string, unknown> | null | undefined)?.[k], obj);
}

/**
 * Menú de acciones por fila (kebab). El desplegable FLOTA en un portal con posición fija
 * (calculada desde el botón) para que no lo recorte el contenedor con scroll de la tabla.
 */
function ActionsMenu<T>({ item, actions }: { item: T; actions: ActionDef<T>[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const POP_WIDTH = 190;

  function place() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const estH = actions.length * 44 + 10;
    let top = r.bottom + 4;
    if (top + estH > window.innerHeight - 8) top = Math.max(8, r.top - estH - 4);
    let left = r.right - POP_WIDTH;
    if (left < 8) left = 8;
    setPos({ top, left });
  }

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onMove = () => setOpen(false); // al hacer scroll/resize, cierra (la posición fija se desalinea)
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open]);

  if (actions.length === 0) return null;
  return (
    <>
      <button
        ref={btnRef}
        className="icon-btn kebab"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Acciones"
        onClick={(e) => {
          e.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            place();
            setOpen(true);
          }
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="actions-pop"
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, width: POP_WIDTH }}
          >
            {actions.map((a, i) => (
              <button
                key={i}
                role="menuitem"
                className={`actions-item${a.variant === "destructive" ? " destructive" : ""}${a.separator ? " sep" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  a.onClick(item);
                }}
              >
                {a.icon && <span className="actions-icon">{a.icon}</span>}
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  columns,
  data,
  getRowId,
  searchKeys = [],
  searchPlaceholder = "Buscar…",
  filters,
  actions,
  onRowClick,
  mobileCard,
  isLoading,
  isError,
  onRetry,
  emptyText = "Sin resultados",
  onCreate,
  createLabel = "Crear",
  defaultPageSize = 10,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const tbl = useDataTable<T>({ data, searchKeys, defaultPageSize });
  const hasActions = !!actions && data.some((it) => actions(it).length > 0);
  const colCount = columns.length + (hasActions ? 1 : 0);

  return (
    <div className="data-table">
      {(title || onCreate) && (
        <div className="dt-header">
          {title && <h2 className="dt-title">{title}</h2>}
          {onCreate && (
            <button className="btn dt-create" onClick={onCreate}>
              <Plus size={16} aria-hidden="true" /> {createLabel}
            </button>
          )}
        </div>
      )}

      {/* Barra de búsqueda + filtros */}
      <div className="dt-toolbar">
        <div className="dt-search">
          <Search size={16} aria-hidden="true" className="dt-search-icon" />
          <input
            type="search"
            value={tbl.search}
            onChange={(e) => tbl.setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        {filters?.map((f) => (
          <select
            key={f.key}
            className="dt-filter"
            value={tbl.filters[f.key] || "__all__"}
            onChange={(e) => tbl.setFilter(f.key, e.target.value)}
            aria-label={f.label}
          >
            <option value="__all__">{f.allLabel || `${f.label}: todas`}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Móvil: SIEMPRE tarjetas (la mobileCard provista o una por defecto), nunca tabla con
          scroll horizontal apretado. */}
      {isMobile ? (
        <div className="dt-cards">
          {isError ? (
            <ErrorState onRetry={onRetry} />
          ) : isLoading ? (
            <p className="muted dt-center">Cargando…</p>
          ) : tbl.paged.length === 0 ? (
            <p className="muted dt-center">{emptyText}</p>
          ) : (
            tbl.paged.map((item) => (
              <div
                className={`card dt-card${onRowClick ? " clickable" : ""}`}
                key={getRowId(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                <div className="dt-card-body">
                  {mobileCard ? (
                    mobileCard(item)
                  ) : (
                    <div className="dt-card-fields">
                      {columns.map((col) => (
                        <div className="dt-card-field" key={col.key}>
                          <span className="dt-card-label">{col.label}</span>
                          <span>
                            {col.render ? col.render(item) : (getNested(item, col.key) as ReactNode)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {hasActions && <ActionsMenu item={item} actions={actions!(item)} />}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="dt-scroll">
          <table className="dt-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`${col.className ?? ""}${col.sortable ? " sortable" : ""}${col.hideOnMobile ? " hide-mobile" : ""}`}
                    onClick={col.sortable ? () => tbl.toggleSort(col.key) : undefined}
                    aria-sort={
                      tbl.sort.key === col.key
                        ? tbl.sort.dir === "asc"
                          ? "ascending"
                          : tbl.sort.dir === "desc"
                            ? "descending"
                            : "none"
                        : undefined
                    }
                  >
                    <span className="dt-th">
                      {col.label}
                      {col.sortable && (
                        <SortIcon dir={tbl.sort.key === col.key ? tbl.sort.dir : null} />
                      )}
                    </span>
                  </th>
                ))}
                {hasActions && <th className="dt-actions-col" aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {isError ? (
                <tr>
                  <td colSpan={colCount}>
                    <ErrorState onRetry={onRetry} />
                  </td>
                </tr>
              ) : isLoading ? (
                Array.from({ length: Math.min(tbl.pageSize, 5) }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {columns.map((col) => (
                      <td key={col.key} className={col.hideOnMobile ? "hide-mobile" : ""}>
                        <span className="dt-skeleton" />
                      </td>
                    ))}
                    {hasActions && <td />}
                  </tr>
                ))
              ) : tbl.paged.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="dt-center muted">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                tbl.paged.map((item) => (
                  <tr
                    key={getRowId(item)}
                    className={onRowClick ? "clickable" : undefined}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.hideOnMobile ? "hide-mobile" : ""}>
                        {col.render ? col.render(item) : (getNested(item, col.key) as ReactNode)}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="dt-actions-col">
                        <ActionsMenu item={item} actions={actions!(item)} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!isLoading && !isError && tbl.totalItems > 0 && (
        <div className="dt-pagination">
          <div className="muted dt-count">
            Mostrando {Math.min((tbl.page - 1) * tbl.pageSize + 1, tbl.totalItems)}–
            {Math.min(tbl.page * tbl.pageSize, tbl.totalItems)} de <strong>{tbl.totalItems}</strong>
          </div>
          <div className="dt-pager">
            <label className="muted dt-perpage">
              Por página{" "}
              <select
                value={tbl.pageSize}
                onChange={(e) => tbl.setPageSize(Number(e.target.value))}
                aria-label="Filas por página"
              >
                {[5, 10, 20, 50].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="dt-pages">
              <button
                className="icon-btn"
                disabled={tbl.page <= 1}
                onClick={() => tbl.setPage(tbl.page - 1)}
                aria-label="Anterior"
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              {pageNumbers(tbl.page, tbl.totalPages).map((p) => (
                <button
                  key={p}
                  className={`page-btn${p === tbl.page ? " active" : ""}`}
                  onClick={() => tbl.setPage(p)}
                  aria-current={p === tbl.page ? "page" : undefined}
                >
                  {p}
                </button>
              ))}
              <button
                className="icon-btn"
                disabled={tbl.page >= tbl.totalPages}
                onClick={() => tbl.setPage(tbl.page + 1)}
                aria-label="Siguiente"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="dt-center" style={{ padding: "2rem 0" }}>
      <p className="error">No se pudieron cargar los datos.</p>
      {onRetry && (
        <button className="btn secondary" onClick={onRetry}>
          Reintentar
        </button>
      )}
    </div>
  );
}

function pageNumbers(page: number, totalPages: number): number[] {
  const n = Math.min(totalPages, 5);
  return Array.from({ length: n }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });
}
