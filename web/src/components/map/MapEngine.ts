import type { Bbox, Center, Need } from "../../lib/types";

/** Marcador genérico de una orden de entrega para el mapa. */
export interface OrderMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
}

export interface MapEngineOptions {
  center: { lat: number; lng: number };
  zoom: number;
  onViewportChange?: (bbox: Bbox) => void;
  onNeedClick?: (need: Need) => void;
  onCenterClick?: (center: Center) => void;
  /** Toque del marcador de una orden (p. ej. dibujar la ruta origen→destino). */
  onOrderClick?: (id: string) => void;
  /** "Ver más detalles" en el popup de una orden (abre el modal). */
  onOrderDetails?: (id: string) => void;
}

/**
 * Abstracción del motor de mapa. Permite intercambiar la implementación subyacente
 * (Leaflet hoy; MapLibre GL vectorial en el futuro) sin tocar la aplicación.
 */
export interface MapEngine {
  mount(container: HTMLElement, opts: MapEngineOptions): void;
  setView(lat: number, lng: number, zoom?: number): void;
  getBounds(): Bbox;
  /** Reemplaza el conjunto completo de necesidades mostradas. */
  setNeeds(needs: Need[]): void;
  /** Inserta o actualiza una necesidad (tiempo real). */
  upsertNeed(need: Need): void;
  /** Quita una necesidad del mapa (tiempo real). */
  removeNeed(id: string): void;
  /** Reemplaza el conjunto de centros de acopio mostrados (capa distinta). */
  setCenters(centers: Center[]): void;
  /** Inserta o actualiza un centro de acopio (tiempo real). */
  upsertCenter(center: Center): void;
  /** Quita un centro de acopio del mapa (tiempo real). */
  removeCenter(id: string): void;
  /** Reemplaza el conjunto de órdenes de entrega mostradas (capa propia). */
  setOrders(orders: OrderMarker[]): void;
  /** Dibuja la ruta origen→destino (línea + marcador de destino) y ajusta la vista. */
  showRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }): void;
  /** Limpia la ruta dibujada. */
  clearRoute(): void;
  /** Activa el modo selección de zona; invoca el callback con la coordenada elegida. */
  enablePicker(onPick: (lat: number, lng: number) => void): void;
  /** Coloca/mueve el marcador del selector y centra el mapa (p. ej. "mi ubicación"). */
  setPickerMarker(lat: number, lng: number, zoom?: number): void;
  destroy(): void;
}

/**
 * Crea el motor de mapa cargándolo de forma diferida (code-splitting) para no penalizar el
 * primer pintado en redes lentas (SC-004). Leaflet vive en su propio chunk.
 */
export async function createMapEngine(): Promise<MapEngine> {
  const { LeafletEngine } = await import("./LeafletEngine");
  return new LeafletEngine();
}
