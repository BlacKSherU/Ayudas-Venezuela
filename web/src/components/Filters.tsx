import { useCategories } from "../App";
import { t } from "../i18n";
import type { Urgency } from "../lib/types";

export interface FilterValue {
  category: string | "";
  urgency: Urgency | "";
}

/** Filtros del mapa por tipo de insumo y urgencia (US2). */
export function Filters({
  value,
  onChange,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
}) {
  const categories = useCategories();
  return (
    <div className="filters">
      <label>
        {t.map.filterCategory}
        <select
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        >
          <option value="">{t.map.all}</option>
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.icon} {c.labelEs}
            </option>
          ))}
        </select>
      </label>
      <label>
        {t.map.filterUrgency}
        <select
          value={value.urgency}
          onChange={(e) => onChange({ ...value, urgency: e.target.value as Urgency | "" })}
        >
          <option value="">{t.map.all}</option>
          <option value="alta">{t.urgency.alta}</option>
          <option value="media">{t.urgency.media}</option>
          <option value="baja">{t.urgency.baja}</option>
        </select>
      </label>
    </div>
  );
}
