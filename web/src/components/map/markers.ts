import L from "leaflet";
import type { Need, Urgency } from "../../lib/types";

// Marcas de mapa personalizadas (feature 4): pin tipo "gota" con color por urgencia y un glifo
// de la categoría dentro (necesidades), y un pin azul con icono de almacén (centros de acopio).

const URGENCY_COLOR: Record<Urgency, string> = {
  alta: "#c0392b",
  media: "#b9770e",
  baja: "#0b6e4f",
};
const CENTER_COLOR = "#1d4ed8";

// Glifos por categoría (viewBox 0 0 24 24, estilo trazo, legibles a ~16px).
const CATEGORY_GLYPHS: Record<string, string> = {
  agua: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C8 11.1 7 13 7 15a7 7 0 0 0 7 7z"/>',
  alimentos:
    '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>',
  medicinas:
    '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  higiene: '<path d="M12 2.5l1.8 5.7 5.7 1.8-5.7 1.8L12 17.5l-1.8-5.7L4.5 10l5.7-1.8z"/>',
  abrigo: '<path d="M3 10l9-7 9 7"/><path d="M5 9v11h14V9"/>',
  bebes: '<rect x="9" y="9" width="6" height="11" rx="2"/><path d="M10 9V6h4v3"/><path d="M11 4h2"/>',
};
const FALLBACK_GLYPH = '<circle cx="12" cy="12" r="4.2"/>';
// Almacén (warehouse) simplificado para los centros de acopio.
const CENTER_GLYPH = '<path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><rect x="9" y="13" width="6" height="8"/>';

function pinSvg(color: string, glyph: string, big = false): string {
  const w = big ? 34 : 30;
  const h = big ? 46 : 40;
  return `<svg width="${w}" height="${h}" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M15 1C7.3 1 1 7 1 14.5 1 25 15 39 15 39s14-14 14-24.5C29 7 22.7 1 15 1Z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <g transform="translate(7.5 6.5) scale(0.625)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
  </svg>`;
}

/** Pin personalizado de una necesidad: color por urgencia + glifo de su primera categoría. */
export function needDivIcon(need: Need): L.DivIcon {
  const color = URGENCY_COLOR[need.urgency] ?? URGENCY_COLOR.media;
  const cat = need.items[0]?.categoryCode ?? "";
  const glyph = CATEGORY_GLYPHS[cat] ?? FALLBACK_GLYPH;
  const big = need.urgency === "alta";
  const size: [number, number] = big ? [34, 46] : [30, 40];
  return L.divIcon({
    className: "map-pin need-pin",
    html: pinSvg(color, glyph, big),
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] - 1],
    popupAnchor: [0, -size[1] + 6],
  });
}

/** Pin personalizado de un centro de acopio (azul + icono de almacén). */
export function centerDivIcon(): L.DivIcon {
  return L.divIcon({
    className: "map-pin center-pin",
    html: pinSvg(CENTER_COLOR, CENTER_GLYPH),
    iconSize: [30, 40],
    iconAnchor: [15, 39],
    popupAnchor: [0, -34],
  });
}

// Glifo de "marcar punto": una cruz/mira centrada.
const PICKER_GLYPH = '<path d="M12 2v20"/><path d="M2 12h20"/><circle cx="12" cy="12" r="3"/>';

/** Pin del selector de ubicación (verde), con estilo propio (evita el marcador roto por defecto). */
export function pickerDivIcon(): L.DivIcon {
  return L.divIcon({
    className: "map-pin picker-pin",
    html: pinSvg("#0b6e4f", PICKER_GLYPH, true),
    iconSize: [34, 46],
    iconAnchor: [17, 45],
    popupAnchor: [0, -40],
  });
}
