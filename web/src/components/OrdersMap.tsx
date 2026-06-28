import { useEffect, useRef } from "react";
import { createMapEngine, type MapEngine } from "./map/MapEngine";
import { useGeolocation } from "../hooks/useGeolocation";
import type { Order } from "../lib/types";

/**
 * Mapa de órdenes de entrega disponibles para el voluntario (feature 4). Muestra cada orden en
 * su punto de recogida; al tocar un marcador se invoca onSelect(id) para verla/tomarla.
 */
export function OrdersMap({
  orders,
  labelFor,
  onSelect,
}: {
  orders: Order[];
  labelFor: (o: Order) => string;
  onSelect: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const geo = useGeolocation();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const labelRef = useRef(labelFor);
  labelRef.current = labelFor;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

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
        onOrderClick: (id) => selectRef.current(id),
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

  // Re-sincroniza los marcadores cuando cambian las órdenes.
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
