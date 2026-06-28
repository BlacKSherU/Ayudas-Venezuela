import { Map, Warehouse, HeartHandshake, Users } from "lucide-react";

/** Las cuatro secciones principales de navegación (feature 4). */
export const SECTIONS = ["mapa", "centros", "necesitados", "voluntarios"] as const;
export type Section = (typeof SECTIONS)[number];

const ITEMS: { key: Section; label: string; Icon: typeof Map }[] = [
  { key: "mapa", label: "Mapa", Icon: Map },
  { key: "centros", label: "Centros de acopio", Icon: Warehouse },
  { key: "necesitados", label: "Necesitados", Icon: HeartHandshake },
  { key: "voluntarios", label: "Voluntarios", Icon: Users },
];

/** Navegación principal de 4 secciones (abierta a cualquiera). */
export function SectionNav({
  active,
  onNavigate,
}: {
  active: Section;
  onNavigate: (section: Section) => void;
}) {
  return (
    <nav className="tabs section-nav" aria-label="Secciones">
      {ITEMS.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onNavigate(key)}
          aria-current={active === key ? "page" : undefined}
          className="section-tab"
        >
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
