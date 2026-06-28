import { LogIn } from "lucide-react";
import { useSession } from "../App";

/**
 * Aviso que invita a iniciar sesión con el botón global (feature 4, US1). Reemplaza los
 * "gates" de identidad dispersos por acción: el acceso se centraliza en un único punto.
 */
export function LoginPrompt({ action }: { action?: string }) {
  const { openLogin } = useSession();
  return (
    <div className="container">
      <div className="card login-prompt">
        <h2>Inicia sesión para continuar</h2>
        <p className="muted">
          {action ? `Para ${action} necesitas ` : "Necesitas "}
          verificar tu identidad. Usa el botón de la cabecera o el de aquí abajo; basta una vez
          por sesión.
        </p>
        <button className="btn" onClick={openLogin}>
          <LogIn size={18} aria-hidden="true" /> Iniciar sesión
        </button>
      </div>
    </div>
  );
}
