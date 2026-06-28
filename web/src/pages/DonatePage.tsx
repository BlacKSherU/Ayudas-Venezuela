import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useSession, useCategories } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { MapPicker } from "../components/MapPicker";
import { NeedLocationMap } from "../components/NeedLocationMap";
import { DirectDeliveryForm } from "../components/DirectDeliveryForm";
import { Truck } from "lucide-react";
import { setRoleTag, requestPushPermission } from "../lib/push";
import type { MyCenter, Need } from "../lib/types";

/** US2: el donante elige una necesidad pendiente y publica una orden de entrega. */
export function DonatePage() {
  const { identityId, loading } = useSession();
  const categories = useCategories();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selected, setSelected] = useState<Need | null>(null);
  const [mode, setMode] = useState<"order" | "direct">("order");
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [centers, setCenters] = useState<MyCenter[]>([]);
  // Origen de recogida: un centro propio ("centro:<id>") o un punto en el mapa ("punto").
  const [pickupSource, setPickupSource] = useState<string>("punto");
  const [donorContact, setDonorContact] = useState("");
  const [codes, setCodes] = useState<{ pickupCode: string; dropoffCode: string } | null>(null);
  const [directDone, setDirectDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = (code: string) => categories.find((c) => c.code === code)?.labelEs ?? code;

  useEffect(() => {
    if (!identityId) return;
    // Suscribe a notificaciones de nuevas necesidades como donante.
    setRoleTag("donor", true);
    requestPushPermission();
    api
      .listNeeds({
        bbox: { minLng: -73.4, minLat: 0.6, maxLng: -59.8, maxLat: 12.3 },
        status: "pendiente",
        limit: 100,
      })
      .then((r) => setNeeds(r.needs))
      .catch(() => setNeeds([]));
    // Centros propios (opcional): permiten donar usando su ubicación como punto de recogida.
    api
      .myCenters()
      .then((r) => setCenters(r.centers.filter((c) => c.status === "activo")))
      .catch(() => setCenters([]));
  }, [identityId]);

  // Preselección desde el mapa: #/centros?view=donar&need=<id> abre esa necesidad directamente.
  useEffect(() => {
    if (!identityId) return;
    const readNeed = () => {
      const q = window.location.hash.split("?")[1] ?? "";
      const id = new URLSearchParams(q).get("need");
      if (id) api.getNeed(id).then(setSelected).catch(() => {});
    };
    readNeed();
    window.addEventListener("hashchange", readNeed);
    return () => window.removeEventListener("hashchange", readNeed);
  }, [identityId]);

  const usingCenter = pickupSource.startsWith("centro:");
  const canPublish = usingCenter || !!pickup;

  async function publish() {
    if (!selected || !canPublish) return;
    setBusy(true);
    setError(null);
    try {
      const base = usingCenter
        ? { needId: selected.id, centerId: pickupSource.slice("centro:".length) }
        : { needId: selected.id, pickupLocation: pickup! };
      const r = await api.createOrder({ ...base, donorContact: donorContact.trim() || null });
      setCodes({ pickupCode: r.pickupCode, dropoffCode: r.dropoffCode });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo publicar la orden");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId) return <LoginPrompt action="donar" />;

  if (directDone)
    return (
      <div className="container">
        <div className="notice">
          <h2>¡Entrega directa registrada!</h2>
          <p>Quedó en el libro público de inventario, como salida tuya y entrada del necesitado.</p>
        </div>
      </div>
    );

  if (codes)
    return (
      <div className="container">
        <div className="notice">
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Truck size={20} aria-hidden="true" /> ¡Orden publicada!
          </h2>
          <p>Un transportista podrá recogerla. Guarda tu código de recogida:</p>
          <p style={{ fontSize: "1.6rem", fontWeight: 700, letterSpacing: "2px" }}>
            {codes.pickupCode}
          </p>
          <p className="muted">
            Dáselo al transportista cuando recoja los insumos. El código de entrega le llegará a
            la persona necesitada.
          </p>
        </div>
      </div>
    );

  return (
    <div className="container">
      <h2>Donar a una necesidad</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!selected ? (
        <>
          <p className="muted">Elige una necesidad pendiente para preparar tu donación:</p>
          {needs.length === 0 && <p className="muted">No hay necesidades pendientes ahora.</p>}
          {needs.map((n) => (
            <button
              key={n.id}
              className="card"
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelected(n)}
            >
              <span className={`badge ${n.urgency}`}>{n.urgency}</span>{" "}
              {n.items.map((i) => label(i.categoryCode)).join(", ")}
              {n.note && <div className="muted">{n.note}</div>}
            </button>
          ))}
        </>
      ) : (
        <>
          <p>
            Donación para: <strong>{selected.items.map((i) => label(i.categoryCode)).join(", ")}</strong>
          </p>
          {selected.note && <p className="muted">{selected.note}</p>}
          <NeedLocationMap need={selected} />
          {selected.contactPublic && (
            <p>
              Contacto de la persona: <strong>{selected.contactPublic}</strong>
            </p>
          )}
          <div className="chips" role="group" aria-label="Cómo entregar">
            <button type="button" className="chip" aria-pressed={mode === "order"} onClick={() => setMode("order")}>
              Que un transportista la lleve
            </button>
            <button type="button" className="chip" aria-pressed={mode === "direct"} onClick={() => setMode("direct")}>
              Entregar yo mismo (en mano)
            </button>
          </div>

          {mode === "order" ? (
            <>
              <label htmlFor="pickup-source" style={{ marginTop: "0.75rem", display: "block" }}>
                ¿Desde dónde recogerá el transportista?
              </label>
              <select
                id="pickup-source"
                value={pickupSource}
                onChange={(e) => setPickupSource(e.target.value)}
              >
                <option value="punto">Marcar un punto en el mapa</option>
                {centers.map((c) => (
                  <option key={c.id} value={`centro:${c.id}`}>
                    Desde mi centro: {c.name}
                  </option>
                ))}
              </select>

              {usingCenter ? (
                <p className="muted" style={{ marginTop: "0.5rem" }}>
                  La recogida será en la ubicación de tu centro de acopio.
                </p>
              ) : (
                <>
                  <p className="muted" style={{ marginTop: "0.75rem" }}>
                    Marca dónde recogerá el transportista tus insumos:
                  </p>
                  <MapPicker onPick={(lat, lng) => setPickup({ lat, lng })} />
                </>
              )}

              <label htmlFor="donor-contact" style={{ marginTop: "0.75rem", display: "block" }}>
                Tu contacto para coordinar la recogida (opcional)
              </label>
              <input
                id="donor-contact"
                value={donorContact}
                onChange={(e) => setDonorContact(e.target.value)}
                placeholder="Ej.: WhatsApp +58…"
                maxLength={200}
              />
              <p className="muted">El voluntario lo verá para coordinar contigo la recogida.</p>

              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <button className="btn secondary" onClick={() => setSelected(null)}>
                  Volver
                </button>
                <button className="btn" disabled={!canPublish || busy} onClick={publish}>
                  {busy ? "Publicando…" : "Publicar orden de entrega"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginTop: "0.75rem" }}>
              <DirectDeliveryForm needId={selected.id} onDone={() => setDirectDone(true)} />
              <button className="btn secondary" style={{ marginTop: "0.5rem" }} onClick={() => setSelected(null)}>
                Volver
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
