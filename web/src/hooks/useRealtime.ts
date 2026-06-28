import { useEffect, useRef } from "react";
import type { Bbox, RealtimeEvent } from "../lib/types";

const WS_BASE = (import.meta.env.VITE_WS_BASE as string) ?? "ws://localhost:8787/api/v1";

interface RealtimeHandlers {
  onEvent: (event: RealtimeEvent) => void;
  onStatusChange?: (online: boolean) => void;
}

/**
 * Conexión de tiempo real al mapa. Suscribe el viewport actual, reconecta con backoff y
 * cae a polling si el WebSocket no está disponible (FR-012, degradación elegante).
 *
 * Devuelve una función para actualizar el bbox suscrito (al hacer pan/zoom).
 */
export function useRealtime(handlers: RealtimeHandlers): {
  updateBbox: (bbox: Bbox) => void;
} {
  const wsRef = useRef<WebSocket | null>(null);
  const bboxRef = useRef<Bbox | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const sendSubscribe = () => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN && bboxRef.current) {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            bbox: [
              bboxRef.current.minLng,
              bboxRef.current.minLat,
              bboxRef.current.maxLng,
              bboxRef.current.maxLat,
            ],
            filters: { status: "pendiente" },
          }),
        );
      }
    };

    const connect = () => {
      if (closedRef.current) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${WS_BASE}/realtime?region=VE`);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        handlersRef.current.onStatusChange?.(true);
        sendSubscribe();
      };
      ws.onmessage = (ev) => {
        try {
          handlersRef.current.onEvent(JSON.parse(ev.data as string) as RealtimeEvent);
        } catch {
          /* mensaje no JSON: ignorar */
        }
      };
      ws.onclose = () => {
        handlersRef.current.onStatusChange?.(false);
        scheduleReconnect();
      };
      ws.onerror = () => ws.close();
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
      retryRef.current += 1;
      reconnectTimer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      closedRef.current = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  return {
    updateBbox: (bbox: Bbox) => {
      bboxRef.current = bbox;
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "subscribe",
            bbox: [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat],
            filters: { status: "pendiente" },
          }),
        );
      }
    },
  };
}
