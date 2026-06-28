import { useEffect, useState, useCallback, type ReactElement } from "react";
import { api } from "../lib/api";
import { useSession } from "../App";
import { LoginPrompt } from "../components/LoginPrompt";
import { RoleSwitcher } from "../components/RoleSwitcher";
import { SupportSignup, OrdersList } from "../pages/DeliverPage";
import type { SupportProfile, SupportRole } from "../lib/types";

// Registro extensible rol → interfaz. Añadir un nuevo tipo de voluntario es registrar aquí su
// componente (y el rol en el catálogo `support_roles`), sin tocar la estructura de la sección.
const ROLE_INTERFACES: Record<string, (p: { role: SupportProfile }) => ReactElement> = {
  repartidor: ({ role }) => <OrdersList support={role} />,
  transportista: ({ role }) => <OrdersList support={role} />,
};

function RoleInterface({ role }: { role: SupportProfile }) {
  const Comp = ROLE_INTERFACES[role.roleCode];
  if (Comp) return <Comp role={role} />;
  // Rol futuro aún sin interfaz dedicada: degradación elegante.
  return (
    <div className="container">
      <p className="muted">La interfaz para este tipo de voluntario estará disponible pronto.</p>
    </div>
  );
}

/** Sección Voluntarios (feature 4, US3): interfaz adaptativa al rol + selector multi-rol. */
export function VolunteersSection() {
  const { identityId, loading } = useSession();
  const [roles, setRoles] = useState<SupportProfile[]>([]);
  const [catalog, setCatalog] = useState<SupportRole[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const r = await api.mySupportRoles();
      setRoles(r.roles);
      setActive((prev) => prev ?? r.roles[0]?.roleCode ?? null);
    } catch {
      setRoles([]);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    api.roles().then((r) => setCatalog(r.roles)).catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    if (identityId) void load();
    else setChecking(false);
  }, [identityId, load]);

  if (loading) return <div className="container">Cargando…</div>;
  if (!identityId) return <LoginPrompt action="ser voluntario" />;
  if (checking) return <div className="container">Cargando…</div>;

  // Sin ningún rol → invitar a registrarse como voluntario.
  if (roles.length === 0) {
    return <SupportSignup onDone={() => void load()} />;
  }

  const activeRole = roles.find((r) => r.roleCode === active) ?? roles[0]!;

  return (
    <div>
      {/* Selector solo cuando hay más de un rol. */}
      {roles.length > 1 && (
        <div className="container volunteer-bar">
          <RoleSwitcher
            roles={roles}
            active={activeRole.roleCode}
            catalog={catalog}
            onChange={setActive}
          />
        </div>
      )}
      <RoleInterface role={activeRole} />
    </div>
  );
}
