import {
  Droplet,
  Apple,
  Pill,
  SprayCan,
  BedDouble,
  Baby,
  Wrench,
  Stethoscope,
  LifeBuoy,
  HeartHandshake,
  Package,
  type LucideIcon,
} from "lucide-react";

// Mapa de código de categoría → icono profesional (lucide-react). Reemplaza los emojis.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  agua: Droplet,
  alimentos: Apple,
  medicinas: Pill,
  higiene: SprayCan,
  abrigo: BedDouble,
  bebes: Baby,
  herramientas: Wrench,
  medico: Stethoscope,
  rescatista: LifeBuoy,
  voluntario: HeartHandshake,
};

/** Icono de una categoría de recurso (cae a un icono genérico si no está mapeada). */
export function CategoryIcon({ code, size = 16 }: { code: string; size?: number }) {
  const Icon = CATEGORY_ICONS[code] ?? Package;
  return <Icon size={size} aria-hidden="true" style={{ verticalAlign: "-2px" }} />;
}
