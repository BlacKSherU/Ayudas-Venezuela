import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserCircle2, Pencil } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../App";
import { Modal } from "./Modal";

/**
 * Control único de sesión en la cabecera (feature 4, US1):
 * - Sin sesión → botón "Iniciar sesión".
 * - Con sesión → solo el icono de persona; al tocarlo, un submenú con "Editar cuenta" y
 *   "Cerrar sesión".
 */
export function LoginButton() {
  const { identityId, loading, openLogin, refresh } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function logout() {
    setMenuOpen(false);
    await api.logout();
    await refresh();
  }

  async function openEdit() {
    setMenuOpen(false);
    setEditOpen(true);
    if (identityId) {
      try {
        const inv = await api.getInventory(identityId);
        setName(inv.owner.publicName ?? "");
      } catch {
        /* sin nombre previo */
      }
    }
  }

  async function saveName() {
    setBusy(true);
    try {
      await api.setPublicName(name.trim() || null);
      setEditOpen(false);
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
    <div className="login-status" ref={ref}>
      <button
        className="icon-btn account-btn"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Mi cuenta"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <UserCircle2 size={22} aria-hidden="true" />
      </button>
      {menuOpen && (
        <div className="account-menu" role="menu">
          <button role="menuitem" className="actions-item" onClick={openEdit}>
            <span className="actions-icon">
              <Pencil size={16} aria-hidden="true" />
            </span>
            Editar cuenta
          </button>
          <button role="menuitem" className="actions-item destructive sep" onClick={logout}>
            <span className="actions-icon">
              <LogOut size={16} aria-hidden="true" />
            </span>
            Cerrar sesión
          </button>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar cuenta"
        footer={
          <>
            <button className="btn secondary" onClick={() => setEditOpen(false)}>
              Cancelar
            </button>
            <button className="btn" disabled={busy} onClick={saveName}>
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </>
        }
      >
        <label htmlFor="acc-name">Nombre público</label>
        <input
          id="acc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Real o seudónimo"
        />
        <p className="muted">Así te ven los demás en inventarios y movimientos.</p>
      </Modal>
    </div>
  );
}
