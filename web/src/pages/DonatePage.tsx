import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useSession, useCategories } from "../App";
import { IdentityGate } from "../components/IdentityGate";
import { MapPicker } from "../components/MapPicker";
import { setRoleTag, requestPushPermission } from "../lib/push";
import type { Need } from "../lib/types";

/** US2: el donante elige una necesidad pendiente y publica una orden de entrega. */
export function DonatePage() {
  const { identityId, loading } = useSession();
  const categories = useCategories();
  const [needs, setNeeds] = useState<Need[]>([]);
  const [selected, setSelected] = useState<Need | null>(null);
  const [pickup, setPickup] = useState<{ lat: number; lng: number } | null>(null);
  const [codes, setCodes] = useState<{ pickupCode: string; dropoffCode: string } | null>(null);
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
  }, [identityId]);

  async function publish() {
    if (!selected || !pickup) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.createOrder({ needId: selected.id, pickupLocation: pickup });
      setCodes({ pickupCode: r.pickupCode, dropoffCode: r.dropoffCode });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo publicar la orden");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId)
    return (
      <div className="container">
        <IdentityGate />
      </div>
    );

  if (codes)
    return (
      <div className="container">
        <div className="notice">
          <h2>¡Orden publicada! 🚚</h2>
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
          <p className="muted">Marca dónde recogerá el transportista tus insumos:</p>
          <MapPicker onPick={(lat, lng) => setPickup({ lat, lng })} />
          <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
            <button className="btn secondary" onClick={() => setSelected(null)}>
              Volver
            </button>
            <button className="btn" disabled={!pickup || busy} onClick={publish}>
              {busy ? "Publicando…" : "Publicar orden de entrega"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
