import { useEffect, useState } from "react";
import { Warehouse } from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useCategories } from "../App";
import { CategoryIcon } from "../lib/icons";
import { MapPicker } from "./MapPicker";
import { MediaCapture } from "./MediaCapture";
import { Stepper } from "./Stepper";
import type { Center, MyCenter } from "../lib/types";

const VE_BBOX = { minLng: -73.4, minLat: 0.6, maxLng: -59.8, maxLat: 12.3 };

/** Donar a un CENTRO de acopio (destino): elegir centro + insumos + origen de recogida. */
export function DonateToCenterFlow() {
  const categories = useCategories();
  const [centers, setCenters] = useState<Center[]>([]);
  const [myCenters, setMyCenters] = useState<MyCenter[]>([]);
  const [selected, setSelected] = useState<Center | null>(null);
  const [items, setItems] = useState<Set<string>>(new Set());
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [pickupSource, setPickupSource] = useState("punto");
  const [donorContact, setDonorContact] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listCenters(VE_BBOX).then((r) => setCenters(r.centers)).catch(() => setCenters([]));
    api.myCenters().then((r) => setMyCenters(r.centers.filter((c) => c.status === "activo"))).catch(() => setMyCenters([]));
  }, []);

  function toggleItem(c: string) {
    setItems((prev) => {
      const n = new Set(prev);
      n.has(c) ? n.delete(c) : n.add(c);
      return n;
    });
  }

  const usingCenter = pickupSource.startsWith("centro:");
  const canPublish = items.size > 0 && (usingCenter || !!pickup);

  async function publish() {
    if (!selected || !canPublish) return;
    setBusy(true);
    setError(null);
    try {
      let donationEvidenceKey: string | null = null;
      if (photo) donationEvidenceKey = (await api.uploadMedia("evidencia", photo)).key;
      const r = await api.createOrder({
        targetCenterId: selected.id,
        items: [...items].map((categoryCode) => ({ categoryCode, quantity: null })),
        ...(usingCenter
          ? { centerId: pickupSource.slice("centro:".length) }
          : { pickupLocation: pickup! }),
        donorContact: donorContact.trim() || null,
        donationEvidenceKey,
      });
      setCode(r.pickupCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo publicar la donación");
    } finally {
      setBusy(false);
    }
  }

  if (code)
    return (
      <div className="notice">
        <h3 style={{ marginTop: 0 }}>¡Donación al centro publicada!</h3>
        <p>Guarda tu código de recogida (dáselo al repartidor):</p>
        <p style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "2px" }}>{code}</p>
      </div>
    );

  if (!selected)
    return (
      <>
        <p className="muted">Elige el centro de acopio que recibirá tu donación:</p>
        {centers.length === 0 && <p className="muted">No hay centros de acopio registrados aún.</p>}
        {centers.map((c) => (
          <button
            key={c.id}
            className="card"
            style={{ width: "100%", textAlign: "left", cursor: "pointer", display: "flex", gap: "0.5rem", alignItems: "center" }}
            onClick={() => setSelected(c)}
          >
            <Warehouse size={18} aria-hidden="true" /> <strong>{c.name}</strong>
            {c.note && <span className="muted">· {c.note}</span>}
          </button>
        ))}
      </>
    );

  const insumos = (
    <>
      <p className="muted" style={{ marginTop: 0 }}>
        Donación para el centro: <strong>{selected.name}</strong>
      </p>
      <div className="chips" role="group" aria-label="¿Qué donas?">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat.code}
            className="chip"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
            aria-pressed={items.has(cat.code)}
            onClick={() => toggleItem(cat.code)}
          >
            <CategoryIcon code={cat.code} /> {cat.labelEs}
          </button>
        ))}
      </div>
    </>
  );

  const origen = (
    <>
      <label htmlFor="c-pickup-source" style={{ marginTop: 0, display: "block" }}>
        ¿Desde dónde recogerá el transportista?
      </label>
      <select id="c-pickup-source" value={pickupSource} onChange={(e) => setPickupSource(e.target.value)}>
        <option value="punto">Marcar un punto en el mapa</option>
        {myCenters.map((c) => (
          <option key={c.id} value={`centro:${c.id}`}>
            Desde mi centro: {c.name}
          </option>
        ))}
      </select>
      {usingCenter ? (
        <p className="muted" style={{ marginTop: "0.5rem" }}>La recogida será en la ubicación de tu centro.</p>
      ) : (
        <div style={{ marginTop: "0.5rem" }}>
          <MapPicker initial={pickup ?? undefined} onPick={(lat, lng) => setPickup({ lat, lng })} />
        </div>
      )}
    </>
  );

  const confirmar = (
    <>
      <label htmlFor="c-donor-contact" style={{ marginTop: 0, display: "block" }}>
        Tu contacto para coordinar la recogida (opcional)
      </label>
      <input
        id="c-donor-contact"
        value={donorContact}
        onChange={(e) => setDonorContact(e.target.value)}
        placeholder="Ej.: WhatsApp +58…"
        maxLength={200}
      />
      <div style={{ margin: "0.75rem 0" }}>
        <MediaCapture label="Evidencia de la donación (opcional)" accept="image/*" onCapture={setPhoto} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="action-bar">
        <button className="btn" disabled={!canPublish || busy} onClick={publish}>
          {busy ? "Publicando…" : "Publicar donación al centro"}
        </button>
        <button className="btn secondary" onClick={() => setSelected(null)}>
          Cambiar centro
        </button>
      </div>
    </>
  );

  return (
    <Stepper
      steps={[
        { title: "¿Qué donas?", content: insumos, canAdvance: items.size > 0 },
        { title: "Origen de recogida", content: origen, canAdvance: usingCenter || !!pickup },
        { title: "Contacto y publicar", content: confirmar },
      ]}
    />
  );
}
