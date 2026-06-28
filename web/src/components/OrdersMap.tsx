import { useEffect, useRef } from "react";
import { createMapEngine, type MapEngine } from "./map/MapEngine";
import { useGeolocation } from "../hooks/useGeolocation";
import { api } from "../lib/api";
import type { Order } from "../lib/types";

/**
 * Mapa de órdenes disponibles (feature 4). Al tocar un marcador se dibuja la ruta del punto de
 * recogida (origen) al destino (ubicación de la necesidad). El popup tiene "Ver más detalles"
 * que abre el modal (onDetails).
 */
export function OrdersMap({
  orders,
  labelFor,
  onDetails,
}: {
  orders: Order[];
  labelFor: (o: Order) => string;
  onDetails: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const geo = useGeolocation();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const labelRef = useRef(labelFor);
  labelRef.current = labelFor;
  const detailsRef = useRef(onDetails);
  detailsRef.current = onDetails;

  const sync = () => {
    engineRef.current?.setOrders(
      ordersRef.current.map((o) => ({
        id: o.id,
        lat: o.pickupZone.lat,
        lng: o.pickupZone.lng,
        title: labelRef.current(o),
      })),
    );
  };

  // Tocar una orden: dibuja la ruta origen (recogida) → destino (ubicación de la necesidad).
  const drawRoute = async (id: string) => {
    const order = ordersRef.current.find((o) => o.id === id);
    if (!order) return;
    try {
      const need = await api.getNeed(order.needId);
      engineRef.current?.showRoute(order.pickupZone, need.zone);
    } catch {
      /* si falla, no se dibuja la ruta */
    }
  };

  useEffect(() => {
    let active = true;
    let engine: MapEngine | null = null;
    void (async () => {
      const e = await createMapEngine();
      if (!active || !ref.current) return;
      engine = e;
      engineRef.current = e;
      e.mount(ref.current, {
        center: geo.center,
        zoom: geo.zoom,
        onOrderClick: (id) => void drawRoute(id),
        onOrderDetails: (id) => detailsRef.current(id),
      });
      sync();
    })();
    return () => {
      active = false;
      engine?.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (geo.status === "ok") engineRef.current?.setView(geo.center.lat, geo.center.lng, 13);
  }, [geo.status, geo.center.lat, geo.center.lng]);

  useEffect(() => {
    sync();
    // eslint-disable-next-line
  }, [orders]);

  return (
    <div
      ref={ref}
      role="application"
      aria-label="Mapa de órdenes disponibles"
      style={{ height: "340px", borderRadius: "10px", overflow: "hidden", marginBottom: "1rem" }}
    />
  );
}
