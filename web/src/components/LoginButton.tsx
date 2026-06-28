import { useState } from "react";
import { LogIn, LogOut, UserCircle2 } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../App";

/**
 * Control único de sesión en la cabecera (feature 4, US1):
 * - Sin sesión → botón "Iniciar sesión" que abre el login global.
 * - Con sesión → identidad + "Cerrar sesión".
 */
export function LoginButton() {
  const { identityId, loading, openLogin, refresh } = useSession();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await api.logout();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  if (!identityId) {
    return (
      <button className="btn login-btn" onClick={openLogin}>
        <LogIn size={18} aria-hidden="true" /> Iniciar sesión
      </button>
    );
  }

  return (
    <div className="login-status">
      <span className="login-id" title="Sesión iniciada">
        <UserCircle2 size={18} aria-hidden="true" /> <span>Sesión activa</span>
      </span>
      <button className="btn secondary login-btn" disabled={busy} onClick={logout}>
        <LogOut size={16} aria-hidden="true" /> <span className="logout-label">Cerrar sesión</span>
      </button>
    </div>
  );
}
