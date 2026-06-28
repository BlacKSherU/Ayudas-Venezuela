import { useCategories } from "../App";
import { t } from "../i18n";
import type { Need } from "../lib/types";

/**
 * Lista accesible de necesidades. Sirve como alternativa al mapa (sin geolocalización, sin
 * soporte de mapa o con lector de pantalla), cumpliendo la degradación elegante (FR-012).
 */
export function NeedList({ needs }: { needs: Need[] }) {
  const categories = useCategories();
  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

  return (
    <section className="container" aria-label={t.map.listFallback}>
      <h2 style={{ fontSize: "1rem" }}>{t.map.listFallback}</h2>
      {needs.length === 0 && <p className="muted">{t.map.empty}</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {needs.map((n) => (
          <li className="card" key={n.id}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className={`badge ${n.urgency}`}>{t.urgency[n.urgency]}</span>
              <span className="muted">{t.status[n.status]}</span>
            </div>
            <p style={{ margin: "0.5rem 0 0.25rem" }}>
              {n.items.map((i) => label(i.categoryCode)).join(", ")}
            </p>
            {n.note && <p className="muted">{n.note}</p>}
            {n.contactPublic && (
              <p className="muted">
                {t.common.contactLabel} {n.contactPublic}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
