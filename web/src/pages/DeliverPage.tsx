import { useEffect, useState, useCallback, type FormEvent } from "react";
import { api, ApiError } from "../lib/api";
import { useSession, useCategories } from "../App";
import { IdentityGate } from "../components/IdentityGate";
import { MediaCapture } from "../components/MediaCapture";
import { useGeolocation } from "../hooks/useGeolocation";
import { setRoleTag, requestPushPermission } from "../lib/push";
import type { Order, SupportProfile, SupportRole } from "../lib/types";

/** US1 + US3: registro de personal de apoyo y toma/entrega de órdenes. */
export function DeliverPage() {
  const { identityId, loading } = useSession();
  const [support, setSupport] = useState<SupportProfile | null>(null);
  const [checking, setChecking] = useState(true);

  const loadSupport = useCallback(async () => {
    setChecking(true);
    try {
      const r = await api.mySupport();
      setSupport(r.support);
    } catch {
      setSupport(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (identityId) void loadSupport();
    else setChecking(false);
  }, [identityId, loadSupport]);

  if (loading || checking) return <div className="container">Cargando…</div>;
  if (!identityId)
    return (
      <div className="container">
        <IdentityGate />
      </div>
    );
  if (!support) return <SupportSignup onDone={loadSupport} />;
  return <OrdersList support={support} />;
}

// --- Registro de personal de apoyo (US1) -----------------------------------

function SupportSignup({ onDone }: { onDone: () => void }) {
  const [roles, setRoles] = useState<SupportRole[]>([]);
  const [roleCode, setRoleCode] = useState("transportista");
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
      <h2>Quiero ayudar con entregas</h2>
      <p className="muted">
        Tus datos de cédula se guardan cifrados y nunca son públicos; solo respaldan tu
        responsabilidad como transportista.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <label htmlFor="role">Rol</label>
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

function OrdersList({ support }: { support: SupportProfile }) {
  const categories = useCategories();
  const geo = useGeolocation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [active, setActive] = useState<{
    order: Order;
    pickupExact: { lat: number; lng: number } | null;
    dropoffExact: { lat: number; lng: number } | null;
  } | null>(null);
  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

  const refresh = useCallback(async () => {
    const d = 0.5;
    const { lat, lng } = geo.center;
    try {
      const r = await api.listOrders({
        minLng: lng - d,
        minLat: lat - d,
        maxLng: lng + d,
        maxLat: lat + d,
      });
      setOrders(r.orders);
    } catch {
      setOrders([]);
    }
  }, [geo.center]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (support.status === "suspendido")
    return (
      <div className="container">
        <p className="warning">Tu perfil está suspendido por reputación o reportes.</p>
      </div>
    );

  if (active) return <OrderFlow data={active} onClose={() => { setActive(null); void refresh(); }} />;

  return (
    <div className="container">
      <h2>Órdenes disponibles</h2>
      <p className="muted">
        Reputación: {support.ratingAvg.toFixed(1)}★ · {support.deliveriesDone} entregas
      </p>
      {orders.length === 0 && <p className="muted">No hay órdenes cercanas ahora.</p>}
      {orders.map((o) => (
        <div className="card" key={o.id}>
          <strong>{o.items.map((i) => label(i.categoryCode)).join(", ")}</strong>
          <div className="muted">Zona de recogida aproximada</div>
          <button
            className="btn"
            style={{ marginTop: "0.5rem" }}
            onClick={async () => {
              const r = await api.takeOrder(o.id);
              setActive(r);
            }}
          >
            Tomar esta entrega
          </button>
        </div>
      ))}
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
    <div className="container card">
      <h2>Entrega en curso</h2>
      <p className="muted">Estado: {order.status}</p>

      {order.status === "tomada" && (
        <>
          <p>
            <strong>Recoge en:</strong>{" "}
            <a href={gmaps(data.pickupExact)} target="_blank" rel="noreferrer">
              abrir mapa de recogida
            </a>
          </p>
          <label>Código de recogida (te lo da el donante)</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          <button className="btn" disabled={busy} onClick={() => advance("pickup")}>
            Confirmar recogida
          </button>
        </>
      )}

      {(order.status === "recogida" || order.status === "en_camino") && (
        <>
          <p>
            <strong>Entrega en:</strong>{" "}
            <a href={gmaps(data.dropoffExact)} target="_blank" rel="noreferrer">
              abrir mapa de entrega
            </a>
          </p>
          <label>Código de entrega (te lo da la persona necesitada)</label>
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          <button className="btn" disabled={busy} onClick={() => advance("deliver")}>
            Confirmar entrega
          </button>
        </>
      )}

      {order.status === "entregada" && (
        <p className="notice">¡Entrega completada! Gracias por tu ayuda. 🙌</p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div style={{ marginTop: "1rem" }}>
        <button className="btn secondary" onClick={onClose}>
          Volver a órdenes
        </button>
      </div>
    </div>
  );
}
