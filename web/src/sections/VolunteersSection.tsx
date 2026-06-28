import { useEffect, useState, useCallback, type ReactElement } from "react";
import { Users } from "lucide-react";
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
  const [adding, setAdding] = useState(false);

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
    return (
      <div>
        <SectionHeader />
        <SupportSignup
          onDone={() => {
            void load();
          }}
        />
      </div>
    );
  }

  // Modo "agregar otro rol".
  if (adding) {
    return (
      <div>
        <SectionHeader />
        <div className="container">
          <button className="btn secondary" onClick={() => setAdding(false)}>
            ← Volver a mi panel
          </button>
        </div>
        <SupportSignup
          onDone={() => {
            setAdding(false);
            void load();
          }}
        />
      </div>
    );
  }

  const activeRole = roles.find((r) => r.roleCode === active) ?? roles[0]!;

  return (
    <div>
      <SectionHeader />
      <div className="container volunteer-bar">
        <RoleSwitcher
          roles={roles}
          active={activeRole.roleCode}
          catalog={catalog}
          onChange={setActive}
        />
        <button className="btn secondary add-role-btn" onClick={() => setAdding(true)}>
          + Agregar otro rol
        </button>
      </div>
      <RoleInterface role={activeRole} />
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="container section-header">
      <h2 className="section-title">
        <Users size={22} aria-hidden="true" /> Voluntarios
      </h2>
      <p className="muted">
        Repartidores, transportistas y más. Cada rol ve su propia interfaz; si tienes varios,
        cambia entre ellos con el selector.
      </p>
    </div>
  );
}
