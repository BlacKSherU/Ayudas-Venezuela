import { useEffect, useState } from "react";

// Centro por defecto: Venezuela (FR-020). Zoom nacional cuando no hay ubicación.
export const VENEZUELA_CENTER = { lat: 7.5, lng: -66.0, zoom: 6 };

export interface GeoState {
  center: { lat: number; lng: number };
  zoom: number;
  status: "locating" | "ok" | "denied" | "unavailable";
}

/**
 * Obtiene la ubicación aproximada de la persona usuaria con degradación elegante: si no hay
 * permiso o soporte, cae al centro de Venezuela (FR-012). No bloquea el renderizado del mapa.
 */
export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    center: { lat: VENEZUELA_CENTER.lat, lng: VENEZUELA_CENTER.lng },
    zoom: VENEZUELA_CENTER.zoom,
    status: "locating",
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unavailable" }));
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setState({
          center: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          zoom: 13,
          status: "ok",
        });
      },
      () => {
        if (cancelled) return;
        setState((s) => ({ ...s, status: "denied" }));
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
