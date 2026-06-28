import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bbox, Center, Need } from "../../lib/types";
import type { MapEngine, MapEngineOptions } from "./MapEngine";
import { needDivIcon, centerDivIcon, pickerDivIcon } from "./markers";
import { t } from "../../i18n";

/** Implementación del MapEngine con Leaflet + tiles raster de OpenStreetMap. */
export class LeafletEngine implements MapEngine {
  private map: L.Map | null = null;
  private layer = L.layerGroup();
  private centerLayer = L.layerGroup();
  private markers = new Map<string, L.Marker>();
  private centerMarkers = new Map<string, L.Marker>();
  private pickerMarker: L.Marker | null = null;
  private onNeedClick?: (need: Need) => void;
  private onCenterClick?: (center: Center) => void;
  private onViewportChange?: (bbox: Bbox) => void;

  mount(container: HTMLElement, opts: MapEngineOptions): void {
    this.onNeedClick = opts.onNeedClick;
    this.onCenterClick = opts.onCenterClick;
    this.onViewportChange = opts.onViewportChange;

    const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(
      [opts.center.lat, opts.center.lng],
      opts.zoom,
    );
    // Tiles de OpenStreetMap (gratuitos). Atribución obligatoria visible.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    this.layer.addTo(map);
    this.centerLayer.addTo(map);
    this.map = map;

    let debounce: ReturnType<typeof setTimeout> | undefined;
    map.on("moveend", () => {
      if (!this.onViewportChange) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => this.onViewportChange?.(this.getBounds()), 250);
    });
    // Notifica el viewport inicial.
    setTimeout(() => this.onViewportChange?.(this.getBounds()), 0);
  }

  setView(lat: number, lng: number, zoom?: number): void {
    this.map?.setView([lat, lng], zoom ?? this.map.getZoom());
  }

  getBounds(): Bbox {
    const b = this.map!.getBounds();
    return {
      minLng: b.getWest(),
      minLat: b.getSouth(),
      maxLng: b.getEast(),
      maxLat: b.getNorth(),
    };
  }

  setNeeds(needs: Need[]): void {
    this.layer.clearLayers();
    this.markers.clear();
    for (const need of needs) this.upsertNeed(need);
  }

  upsertNeed(need: Need): void {
    if (!this.map) return;
    const existing = this.markers.get(need.id);
    if (existing) {
      existing.setLatLng([need.zone.lat, need.zone.lng]);
      existing.setIcon(needDivIcon(need));
      existing.bindPopup(popupHtml(need));
      return;
    }
    const marker = L.marker([need.zone.lat, need.zone.lng], {
      icon: needDivIcon(need),
      title: t.map.title,
      alt: `Necesidad (${need.urgency})`,
      keyboard: true,
    });
    marker.bindPopup(popupHtml(need));
    marker.on("click", () => this.onNeedClick?.(need));
    marker.addTo(this.layer);
    this.markers.set(need.id, marker);
  }

  removeNeed(id: string): void {
    const marker = this.markers.get(id);
    if (marker) {
      this.layer.removeLayer(marker);
      this.markers.delete(id);
    }
  }

  setCenters(centers: Center[]): void {
    this.centerLayer.clearLayers();
    this.centerMarkers.clear();
    for (const c of centers) this.upsertCenter(c);
  }

  upsertCenter(center: Center): void {
    if (!this.map) return;
    const existing = this.centerMarkers.get(center.id);
    if (existing) {
      existing.setLatLng([center.location.lat, center.location.lng]);
      existing.bindPopup(centerPopupHtml(center));
      return;
    }
    // Pin azul con icono de almacén para distinguir el centro de las necesidades.
    const marker = L.marker([center.location.lat, center.location.lng], {
      icon: centerDivIcon(),
      title: center.name,
      keyboard: true,
      alt: `Centro de acopio: ${center.name}`,
    });
    marker.bindPopup(centerPopupHtml(center));
    marker.on("click", () => this.onCenterClick?.(center));
    marker.addTo(this.centerLayer);
    this.centerMarkers.set(center.id, marker);
  }

  removeCenter(id: string): void {
    const marker = this.centerMarkers.get(id);
    if (marker) {
      this.centerLayer.removeLayer(marker);
      this.centerMarkers.delete(id);
    }
  }

  enablePicker(onPick: (lat: number, lng: number) => void): void {
    if (!this.map) return;
    this.map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.placePicker(lat, lng);
      onPick(lat, lng);
    });
  }

  setPickerMarker(lat: number, lng: number, zoom?: number): void {
    if (!this.map) return;
    this.placePicker(lat, lng);
    this.map.setView([lat, lng], zoom ?? this.map.getZoom());
  }

  private placePicker(lat: number, lng: number): void {
    if (!this.map) return;
    if (this.pickerMarker) {
      this.pickerMarker.setLatLng([lat, lng]);
    } else {
      // Pin con estilo propio (evita el marcador roto por defecto de Leaflet con bundlers).
      this.pickerMarker = L.marker([lat, lng], { icon: pickerDivIcon() }).addTo(this.map);
    }
  }

  destroy(): void {
    this.map?.remove();
    this.map = null;
    this.markers.clear();
    this.centerMarkers.clear();
  }
}

function centerPopupHtml(center: Center): string {
  const note = center.note ? `<br/>${escapeHtml(center.note)}` : "";
  return `<strong>${escapeHtml(center.name)}</strong><br/>Centro de acopio${note}`;
}

function popupHtml(need: Need): string {
  const items = need.items
    .map((i) => `${escapeHtml(i.categoryCode)}${i.quantity ? ` (${escapeHtml(i.quantity)})` : ""}`)
    .join(", ");
  const urgency = t.urgency[need.urgency] ?? need.urgency;
  const status = t.status[need.status] ?? need.status;
  const contact = need.contactPublic
    ? `<br/><strong>${t.common.contactLabel}</strong> ${escapeHtml(need.contactPublic)}`
    : "";
  const note = need.note ? `<br/>${escapeHtml(need.note)}` : "";
  // Botón para donar directamente a esta necesidad (solo si sigue pendiente).
  const donate =
    need.status === "pendiente"
      ? `<br/><a class="leaflet-donate-btn" href="#/centros?view=donar&need=${encodeURIComponent(need.id)}">Donar a esta necesidad</a>`
      : "";
  return `<strong>${urgency}</strong> · ${status}<br/>${items}${note}${contact}${donate}`;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      (({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }) as Record<
        string,
        string
      >)[c]!,
  );
}
