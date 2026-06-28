import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

export interface Step {
  title: string;
  content: ReactNode;
  /** Si es false, se bloquea "Siguiente" (paso incompleto). */
  canAdvance?: boolean;
}

/**
 * Wizard por pasos (feature 4). En MÓVIL muestra un paso a la vez (cabe en pantalla, sin
 * scroll de página) con progreso y Atrás/Siguiente abajo. En ESCRITORIO muestra todos los
 * pasos en una sola página (formulario tradicional). El último paso contiene el botón de
 * envío del propio formulario.
 */
export function Stepper({ steps }: { steps: Step[] }) {
  const isMobile = useIsMobile();
  const [i, setI] = useState(0);

  // Escritorio: una sola página con todos los pasos.
  if (!isMobile) {
    return (
      <div className="stepper-desktop">
        {steps.map((s, idx) => (
          <section key={idx} className="stepper-section">
            <h3 className="stepper-section-title">{s.title}</h3>
            {s.content}
          </section>
        ))}
      </div>
    );
  }

  const current = Math.min(i, steps.length - 1);
  const step = steps[current]!;
  const isLast = current === steps.length - 1;

  return (
    <div className="stepper">
      <div className="stepper-head">
        <div className="stepper-dots" aria-hidden="true">
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={idx === current ? "active" : idx < current ? "done" : ""}
            />
          ))}
        </div>
        <p className="muted stepper-label">
          Paso {current + 1} de {steps.length}: <strong>{step.title}</strong>
        </p>
      </div>

      <div className="stepper-body">{step.content}</div>

      <div className="action-bar stepper-nav">
        {current > 0 && (
          <button type="button" className="btn secondary" onClick={() => setI(current - 1)}>
            <ChevronLeft size={16} aria-hidden="true" /> Atrás
          </button>
        )}
        {!isLast && (
          <button
            type="button"
            className="btn"
            disabled={step.canAdvance === false}
            onClick={() => setI(current + 1)}
          >
            Siguiente <ChevronRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
