import type { SupportProfile, SupportRole } from "../lib/types";

/**
 * Selector de rol del voluntario (feature 4, US3). Cuando una persona tiene más de un rol
 * (p. ej. repartidor y transportista), permite cambiar entre ellos; cada uno muestra su
 * interfaz. Si solo tiene uno, se muestra como etiqueta sin selector.
 */
export function RoleSwitcher({
  roles,
  active,
  catalog,
  onChange,
}: {
  roles: SupportProfile[];
  active: string;
  catalog: SupportRole[];
  onChange: (roleCode: string) => void;
}) {
  const label = (code: string) => catalog.find((r) => r.code === code)?.labelEs ?? code;

  if (roles.length <= 1) {
    return (
      <p className="muted role-single">
        Rol: <strong>{label(active)}</strong>
      </p>
    );
  }

  return (
    <div className="chips role-switcher" role="group" aria-label="Cambiar de rol de voluntario">
      {roles.map((r) => (
        <button
          key={r.id}
          type="button"
          className="chip"
          aria-pressed={r.roleCode === active}
          onClick={() => onChange(r.roleCode)}
        >
          {label(r.roleCode)}
        </button>
      ))}
    </div>
  );
}
