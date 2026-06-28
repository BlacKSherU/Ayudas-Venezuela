// Ofuscación geográfica y resolución de región (Principio I: proteger ubicación exacta).
//
// La vista pública nunca expone la dirección exacta del hogar. Antes de persistir, las
// coordenadas se "ajustan" (snap) al centro de una celda de rejilla de ~1 km, de modo que
// muchas ubicaciones distintas dentro de la misma celda colapsan al mismo punto público.

// 1 km ≈ 0.009° de latitud. Usamos una celda de 0.01° (~1.1 km) para simplicidad.
const GRID_DEG = 0.01;

/** Límites aproximados de la Venezuela continental + insular, para validación. */
export const VENEZUELA_BOUNDS = {
  minLat: 0.6,
  maxLat: 12.3,
  minLng: -73.4,
  maxLng: -59.8,
} as const;

/** Ajusta una coordenada al centro de su celda de rejilla (~1 km). */
export function obfuscate(lat: number, lng: number): { lat: number; lng: number } {
  const snap = (v: number) => Math.round(v / GRID_DEG) * GRID_DEG + GRID_DEG / 2;
  // Redondeo a 5 decimales para evitar ruido de coma flotante.
  return {
    lat: Number(snap(lat).toFixed(5)),
    lng: Number(snap(lng).toFixed(5)),
  };
}

/** Verifica que una coordenada cae dentro de los límites de Venezuela. */
export function isWithinVenezuela(lat: number, lng: number): boolean {
  return (
    lat >= VENEZUELA_BOUNDS.minLat &&
    lat <= VENEZUELA_BOUNDS.maxLat &&
    lng >= VENEZUELA_BOUNDS.minLng &&
    lng <= VENEZUELA_BOUNDS.maxLng
  );
}

// Tabla aproximada (bounding box) de estados de Venezuela para asignar region_code.
// Aproximación suficiente para el sharding de tiempo real; refinable más adelante.
const REGION_BOXES: { code: string; minLat: number; maxLat: number; minLng: number; maxLng: number }[] =
  [
    { code: "DC", minLat: 10.4, maxLat: 10.55, minLng: -67.05, maxLng: -66.8 }, // Distrito Capital
    { code: "MIR", minLat: 9.9, maxLat: 10.65, minLng: -67.0, maxLng: -65.7 }, // Miranda
    { code: "VAR", minLat: 10.5, maxLat: 10.75, minLng: -67.1, maxLng: -66.3 }, // La Guaira
    { code: "ARA", minLat: 9.9, maxLat: 10.6, minLng: -67.9, maxLng: -67.0 }, // Aragua
    { code: "CAR", minLat: 9.7, maxLat: 10.7, minLng: -68.6, maxLng: -67.8 }, // Carabobo
    { code: "LAR", minLat: 9.3, maxLat: 10.5, minLng: -70.4, maxLng: -68.6 }, // Lara
    { code: "ZUL", minLat: 8.3, maxLat: 11.8, minLng: -73.4, maxLng: -70.5 }, // Zulia
    { code: "TAC", minLat: 7.2, maxLat: 8.6, minLng: -72.5, maxLng: -71.3 }, // Táchira
    { code: "MER", minLat: 7.5, maxLat: 9.2, minLng: -71.8, maxLng: -70.3 }, // Mérida
    { code: "TRU", minLat: 8.9, maxLat: 9.8, minLng: -71.0, maxLng: -70.0 }, // Trujillo
    { code: "FAL", minLat: 10.5, maxLat: 12.3, minLng: -71.4, maxLng: -68.2 }, // Falcón
    { code: "ANZ", minLat: 8.4, maxLat: 10.3, minLng: -65.6, maxLng: -63.9 }, // Anzoátegui
    { code: "SUC", minLat: 10.0, maxLat: 10.8, minLng: -64.5, maxLng: -62.3 }, // Sucre
    { code: "MON", minLat: 8.3, maxLat: 10.2, minLng: -64.0, maxLng: -62.3 }, // Monagas
    { code: "BOL", minLat: 3.7, maxLat: 8.4, minLng: -67.0, maxLng: -60.0 }, // Bolívar
    { code: "AMA", minLat: 0.6, maxLat: 5.7, minLng: -67.9, maxLng: -63.3 }, // Amazonas
    { code: "DEL", minLat: 7.8, maxLat: 10.0, minLng: -62.5, maxLng: -59.8 }, // Delta Amacuro
    { code: "GUA", minLat: 8.3, maxLat: 9.9, minLng: -68.4, maxLng: -65.4 }, // Guárico
    { code: "APU", minLat: 6.3, maxLat: 8.0, minLng: -72.0, maxLng: -66.4 }, // Apure
    { code: "BAR", minLat: 7.0, maxLat: 8.8, minLng: -71.5, maxLng: -69.0 }, // Barinas
    { code: "POR", minLat: 8.6, maxLat: 9.9, minLng: -70.2, maxLng: -68.7 }, // Portuguesa
    { code: "COJ", minLat: 9.3, maxLat: 10.2, minLng: -68.8, maxLng: -67.8 }, // Cojedes
    { code: "YAR", minLat: 9.9, maxLat: 10.7, minLng: -69.3, maxLng: -68.2 }, // Yaracuy
    { code: "NES", minLat: 10.8, maxLat: 11.2, minLng: -64.5, maxLng: -63.7 }, // Nueva Esparta
  ];

/** Asigna un código de región (estado) a una coordenada. "VE" como respaldo nacional. */
export function resolveRegion(lat: number, lng: number): string {
  for (const r of REGION_BOXES) {
    if (lat >= r.minLat && lat <= r.maxLat && lng >= r.minLng && lng <= r.maxLng) {
      return r.code;
    }
  }
  return "VE";
}

/** Lista de regiones que intersectan un bounding box (para suscripción de tiempo real). */
export function regionsForBbox(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number,
): string[] {
  const codes = REGION_BOXES.filter(
    (r) => r.minLat <= maxLat && r.maxLat >= minLat && r.minLng <= maxLng && r.maxLng >= minLng,
  ).map((r) => r.code);
  return codes.length > 0 ? codes : ["VE"];
}
