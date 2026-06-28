import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Modal genérico reutilizable (port del Dialog/AdminEditDialog de VivaPlayer, en CSS plano):
 * cabecera con título + cerrar, cuerpo desplazable y pie opcional. Cierra con Esc o clic fuera.
 * Mobile-first: a pantalla completa en móvil, centrado en escritorio.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal modal-panel">
        <div className="modal-head">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" aria-label="Cerrar" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Modal de detalle (acción "Ver"): muestra una lista de campos etiqueta→valor. Equivalente al
 * modal de detalle de VivaPlayer para inspeccionar una fila sin editarla.
 */
export function DetailModal({
  open,
  onClose,
  title,
  fields,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  fields: { label: string; value: ReactNode }[];
  footer?: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={footer}>
      <dl className="detail-grid">
        {fields.map((f, i) => (
          <div className="detail-row" key={i}>
            <dt>{f.label}</dt>
            <dd>{f.value ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
