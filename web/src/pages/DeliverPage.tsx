import { useEffect, useState, useCallback, type FormEvent } from "react";
import { Eye, Truck } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useCategories } from "../App";
import { MediaCapture } from "../components/MediaCapture";
import { DataTable, type ColumnDef } from "../components/table/DataTable";
import { OrdersMap } from "../components/OrdersMap";
import { DetailModal } from "../components/Modal";
import { formatDateTime } from "../lib/format";
import { orderStatusLabel } from "../lib/orderStatus";
import { setRoleTag, requestPushPermission } from "../lib/push";
import type { Need, Order, SupportProfile, SupportRole } from "../lib/types";

// Feature 4: la interfaz de voluntario vive en VolunteersSection. Aquí se exportan las piezas
// reutilizables (registro y flujo de órdenes) para que la sección las componga por rol.

// --- Registro de voluntario (US1/US3) --------------------------------------

/** Registro de un rol de voluntario (cédula cifrada). `presetRole` fija el rol a registrar. */
export function SupportSignup({ onDone, presetRole }: { onDone: () => void; presetRole?: string }) {
  const [roles, setRoles] = useState<SupportRole[]>([]);
  const [roleCode, setRoleCode] = useState(presetRole ?? "transportista");
  const [cedula, setCedula] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.roles().then((r) => setRoles(r.roles)).catch(() => setRoles([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!photo) {
      setError("Sube una foto de tu cédula.");
      return;
    }
    setBusy(true);
    try {
      const media = await api.uploadMedia("cedula", photo);
      await api.registerSupport({
        roleCode,
        cedulaNumber: cedula.trim(),
        cedulaPhotoMediaKey: media.key,
      });
      // Para notificaciones de órdenes, los roles de entrega se suscriben como "transportista".
      setRoleTag("transportista", true);
      requestPushPermission();
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo registrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="container card" onSubmit={submit}>
      <h2>Quiero ser voluntario</h2>
      <p className="muted">
        Tus datos de cédula se guardan cifrados y nunca son públicos; solo respaldan tu
        responsabilidad como voluntario.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <label htmlFor="role">Tipo de voluntario</label>
      <select id="role" value={roleCode} onChange={(e) => setRoleCode(e.target.value)}>
        {(roles.length ? roles : [{ code: "transportista", labelEs: "Transportista", requiresCedula: true }]).map(
          (r) => (
            <option key={r.code} value={r.code}>
              {r.labelEs}
            </option>
          ),
        )}
      </select>
      <label htmlFor="cedula">Número de cédula</label>
      <input id="cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
      <div style={{ margin: "0.75rem 0" }}>
        <MediaCapture label="Foto de la cédula" accept="image/*" onCapture={setPhoto} />
      </div>
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Registrando…" : "Registrarme"}
      </button>
    </form>
  );
}

// --- Listado y flujo de órdenes (US3) --------------------------------------

type OrderRow = Order & { itemsText: string } & Record<string, unknown>;

export function OrdersList({ support }: { support: SupportProfile }) {
  const categories = useCategories();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [detail, setDetail] = useState<OrderRow | null>(null);
  const [detailNeed, setDetailNeed] = useState<Need | null>(null);
  const [active, setActive] = useState<{
    order: Order;
    pickupExact: { lat: number; lng: number } | null;
    dropoffExact: { lat: number; lng: number } | null;
  } | null>(null);
  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

  const refresh = useCallback(async () => {
    setFetching(true);
    try {
      // Emergencia nacional: el voluntario ve todas las órdenes disponibles y elige en el mapa.
      const r = await api.listOrders({ minLng: -73.4, minLat: 0.6, maxLng: -59.8, maxLat: 12.3 });
      setOrders(r.orders);
    } catch {
      setOrders([]);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Reanudar: si tengo una orden en curso (reservada/recogida/en camino), la recupero al volver.
  useEffect(() => {
    let cancel = false;
    api
      .activeOrders()
      .then(async (r) => {
        const o = r.orders[0];
        if (!o || cancel) return;
        let dropoffExact: { lat: number; lng: number } | null = null;
        try {
          dropoffExact = (await api.getNeed(o.needId)).zone;
        } catch {
          /* sin destino si falla */
        }
        if (!cancel) setActive({ order: o, pickupExact: o.pickupZone, dropoffExact });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);

  // Al abrir el detalle, carga la necesidad (destino + contacto del necesitado).
  useEffect(() => {
    if (!detail) {
      setDetailNeed(null);
      return;
    }
    api.getNeed(detail.needId).then(setDetailNeed).catch(() => setDetailNeed(null));
  }, [detail]);

  if (support.status === "suspendido")
    return (
      <div className="container">
        <p className="warning">Tu perfil está suspendido por reputación o reportes.</p>
      </div>
    );

  if (active) return <OrderFlow data={active} onClose={() => { setActive(null); void refresh(); }} />;

  const rows: OrderRow[] = orders.map((o) => ({
    ...o,
    itemsText: o.items.map((i) => label(i.categoryCode)).join(", "),
  }));

  async function take(id: string) {
    const r = await api.takeOrder(id);
    setActive(r);
  }

  const columns: ColumnDef<OrderRow>[] = [
    { key: "itemsText", label: "Insumos", render: (o) => o.itemsText },
    { key: "regionCode", label: "Región", sortable: true },
    {
      key: "updatedAt",
      label: "Actualizada",
      sortable: true,
      hideOnMobile: true,
      render: (o) => formatDateTime(o.updatedAt),
    },
  ];

  return (
    <div className="container wide">
      <h2>Órdenes disponibles</h2>
      <p className="muted">
        Reputación: {support.ratingAvg.toFixed(1)}★ · {support.deliveriesDone} entregas
      </p>
      <p className="muted">Toca un punto en el mapa para ver la orden y tomarla.</p>
      <OrdersMap
        orders={orders}
        labelFor={(o) => o.items.map((i) => label(i.categoryCode)).join(", ")}
        onDetails={(id) => {
          const found = rows.find((r) => r.id === id);
          if (found) setDetail(found);
        }}
      />
      <DataTable<OrderRow>
        columns={columns}
        data={rows}
        getRowId={(o) => o.id}
        isLoading={fetching}
        searchKeys={["itemsText", "regionCode"]}
        searchPlaceholder="Buscar orden…"
        emptyText="No hay órdenes cercanas ahora"
        actions={(o) => [
          { label: "Tomar entrega", icon: <Truck size={16} aria-hidden="true" />, onClick: () => take(o.id) },
          { label: "Ver", icon: <Eye size={16} aria-hidden="true" />, separator: true, onClick: () => setDetail(o) },
        ]}
        mobileCard={(o) => (
          <div>
            <strong>{o.itemsText}</strong>
            <div className="muted">Región {o.regionCode} · punto de recogida</div>
          </div>
        )}
      />

      <DetailModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detalle de la orden"
        fields={
          detail
            ? [
                { label: "Insumos", value: detail.itemsText },
                {
                  label: "Origen (recogida)",
                  value: (
                    <a
                      href={`https://maps.google.com/?q=${detail.pickupZone.lat},${detail.pickupZone.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en Maps
                    </a>
                  ),
                },
                {
                  label: "Destino (entrega)",
                  value: detailNeed ? (
                    <a
                      href={`https://maps.google.com/?q=${detailNeed.zone.lat},${detailNeed.zone.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir en Maps
                    </a>
                  ) : (
                    "Cargando…"
                  ),
                },
                { label: "Contacto del donante", value: detail.donorContact ?? "—" },
                { label: "Contacto del necesitado", value: detailNeed?.contactPublic ?? "—" },
                { label: "Región", value: detail.regionCode },
                { label: "Estado", value: orderStatusLabel(detail.status) },
                { label: "Actualizada", value: formatDateTime(detail.updatedAt) },
              ]
            : []
        }
        footer={
          detail ? (
            <button
              className="btn"
              onClick={() => {
                const id = detail.id;
                setDetail(null);
                void take(id);
              }}
            >
              <Truck size={16} aria-hidden="true" /> Tomar esta entrega
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

function OrderFlow({
  data,
  onClose,
}: {
  data: { order: Order; pickupExact: { lat: number; lng: number } | null; dropoffExact: { lat: number; lng: number } | null };
  onClose: () => void;
}) {
  const [order, setOrder] = useState<Order>(data.order);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const gmaps = (p: { lat: number; lng: number } | null) =>
    p ? `https://maps.google.com/?q=${p.lat},${p.lng}` : undefined;

  async function advance(kind: "pickup" | "deliver") {
    setBusy(true);
    setError(null);
    try {
      const r = kind === "pickup" ? await api.pickupOrder(order.id, code) : await api.deliverOrder(order.id, code);
      setOrder(r.order);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código incorrecto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <h2>Entrega en curso</h2>
      <p className="muted">Estado: {orderStatusLabel(order.status)}</p>

      <div className="card">
        {order.status === "tomada" && (
          <>
            <p className="notice" style={{ marginTop: 0 }}>
              Reservada para ti. Aún no está confirmada: se confirma cuando verifiques el código
              de recogida con el donante.
            </p>
            <p>
              <strong>Recoge en:</strong>{" "}
              <a href={gmaps(data.pickupExact)} target="_blank" rel="noreferrer">
                abrir mapa de recogida
              </a>
            </p>
            {order.donorContact && (
              <p>
                <strong>Contacto del donante:</strong> {order.donorContact}
              </p>
            )}
            <label>Código de recogida (te lo da el donante)</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </>
        )}

        {(order.status === "recogida" || order.status === "en_camino") && (
          <>
            <p style={{ marginTop: 0 }}>
              <strong>Entrega en:</strong>{" "}
              <a href={gmaps(data.dropoffExact)} target="_blank" rel="noreferrer">
                abrir mapa de entrega
              </a>
            </p>
            <label>Código de entrega (te lo da la persona necesitada)</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </>
        )}

        {order.status === "entregada" && (
          <p className="notice" style={{ margin: 0 }}>
            ¡Entrega completada! Gracias por tu ayuda.
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Todas las acciones abajo, al mismo nivel. */}
      <div className="action-bar">
        {order.status === "tomada" && (
          <button className="btn" disabled={busy} onClick={() => advance("pickup")}>
            Confirmar recogida
          </button>
        )}
        {(order.status === "recogida" || order.status === "en_camino") && (
          <button className="btn" disabled={busy} onClick={() => advance("deliver")}>
            Confirmar entrega
          </button>
        )}
        {(order.status === "tomada" || order.status === "recogida" || order.status === "en_camino") && (
          <button
            className="btn danger"
            disabled={busy}
            onClick={async () => {
              if (!window.confirm("¿Liberar esta orden para que otro voluntario la tome?")) return;
              setBusy(true);
              try {
                await api.releaseOrder(order.id);
                onClose();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : "No se pudo liberar");
              } finally {
                setBusy(false);
              }
            }}
          >
            Liberar orden
          </button>
        )}
        <button className="btn secondary" onClick={onClose}>
          Volver a órdenes
        </button>
      </div>
    </div>
  );
}
