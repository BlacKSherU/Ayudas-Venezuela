import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bbox, Center, Need, Urgency } from "../../lib/types";
import type { MapEngine, MapEngineOptions } from "./MapEngine";
import { t } from "../../i18n";

const URGENCY_COLOR: Record<Urgency, string> = {
  alta: "#c0392b",
  media: "#b9770e",
  baja: "#0b6e4f",
};

// Color del centro de acopio (azul), distinto de las urgencias de necesidades.
const CENTER_COLOR = "#1d4ed8";

/** Implementación del MapEngine con Leaflet + tiles raster de OpenStreetMap. */
export class LeafletEngine implements MapEngine {
  private map: L.Map | null = null;
  private layer = L.layerGroup();
  private centerLayer = L.layerGroup();
  private markers = new Map<string, L.CircleMarker>();
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
      existing.setStyle({ color: URGENCY_COLOR[need.urgency], fillColor: URGENCY_COLOR[need.urgency] });
      existing.bindPopup(popupHtml(need));
      return;
    }
    const marker = L.circleMarker([need.zone.lat, need.zone.lng], {
      radius: need.urgency === "alta" ? 10 : 8,
      color: URGENCY_COLOR[need.urgency],
      fillColor: URGENCY_COLOR[need.urgency],
      fillOpacity: 0.7,
      weight: 2,
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
    // Marcador cuadrado azul (divIcon) para distinguir el centro de las necesidades (círculos).
    const icon = L.divIcon({
      className: "center-pin",
      html: `<span style="display:block;width:14px;height:14px;background:${CENTER_COLOR};border:2px solid #fff;border-radius:3px;box-shadow:0 0 0 1px ${CENTER_COLOR}"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    const marker = L.marker([center.location.lat, center.location.lng], {
      icon,
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
      if (this.pickerMarker) {
        this.pickerMarker.setLatLng([lat, lng]);
      } else {
        this.pickerMarker = L.marker([lat, lng]).addTo(this.map!);
      }
      onPick(lat, lng);
    });
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
  return `<strong>🏠 ${escapeHtml(center.name)}</strong><br/>Centro de acopio${note}`;
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
  return `<strong>${urgency}</strong> · ${status}<br/>${items}${note}${contact}`;
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
