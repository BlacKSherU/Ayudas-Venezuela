import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./lib/api";
import { pushLogin } from "./lib/push";
import type { Category } from "./lib/types";
import { t } from "./i18n";
import { LoginButton } from "./components/LoginButton";
import { IdentityGate } from "./components/IdentityGate";
import { SectionNav, type Section, SECTIONS } from "./components/SectionNav";
import { MapSection } from "./sections/MapSection";
import { CentersSection } from "./sections/CentersSection";
import { NeedsSection } from "./sections/NeedsSection";
import { VolunteersSection } from "./sections/VolunteersSection";

// --- Enrutado por hash → { sección, vista } --------------------------------
//
// Feature 4: 4 secciones (Mapa, Centros de acopio, Necesitados, Voluntarios). Las rutas
// previas (#/donate, #/inventory, …) se MAPEAN a su nueva ubicación para no romper enlaces
// guardados; la query (p. ej. ?ref=) se conserva, así Transparencia sigue funcionando.

const LEGACY: Record<string, { section: Section; view?: string }> = {
  map: { section: "mapa" },
  distribution: { section: "mapa", view: "distribucion" },
  ledger: { section: "mapa", view: "transparencia" },
  publish: { section: "necesitados", view: "publicar" },
  mine: { section: "necesitados", view: "mis" },
  inventory: { section: "necesitados", view: "inventario" },
  donate: { section: "centros", view: "donar" },
  deliver: { section: "voluntarios" },
};

interface RouteState {
  section: Section;
  view?: string;
}

function parseRoute(): RouteState {
  const hash = window.location.hash || "#/mapa";
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const view = new URLSearchParams(query).get("view") ?? undefined;
  if ((SECTIONS as readonly string[]).includes(path)) return { section: path as Section, view };
  const legacy = LEGACY[path];
  if (legacy) return { section: legacy.section, view: legacy.view };
  return { section: "mapa" };
}

/** Navega a una sección (y opcionalmente una vista) actualizando el hash. */
export function goTo(section: Section, view?: string): void {
  window.location.hash = view ? `#/${section}?view=${view}` : `#/${section}`;
}

// --- Contextos compartidos -------------------------------------------------

interface SessionState {
  identityId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Abre el login global (modal) desde cualquier punto de la app. */
  openLogin: () => void;
}
const SessionCtx = createContext<SessionState>({
  identityId: null,
  loading: true,
  refresh: async () => {},
  openLogin: () => {},
});
export const useSession = () => useContext(SessionCtx);

const CategoriesCtx = createContext<Category[]>([]);
export const useCategories = () => useContext(CategoriesCtx);

// --- App -------------------------------------------------------------------

export function App() {
  const [route, setRoute] = useState<RouteState>(parseRoute());
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setIdentityId(me.identityId);
      // Vincula la suscripción push a la identidad (external_id) para envíos dirigidos.
      if (me.identityId) pushLogin(me.identityId);
    } catch {
      setIdentityId(null);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    api
      .categories()
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
  }, [refresh]);

  const openLogin = useCallback(() => setLoginOpen(true), []);

  const session: SessionState = { identityId, loading: loadingSession, refresh, openLogin };

  return (
    <SessionCtx.Provider value={session}>
      <CategoriesCtx.Provider value={categories}>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <header className="app-bar app-bar-row">
          <div className="app-bar-title">
            <h1>{t.appName}</h1>
            <p>{t.tagline}</p>
          </div>
          <LoginButton />
        </header>

        <SectionNav active={route.section} onNavigate={(s) => goTo(s)} />

        <main id="main">
          {route.section === "mapa" && <MapSection view={route.view} />}
          {route.section === "centros" && <CentersSection view={route.view} />}
          {route.section === "necesitados" && <NeedsSection view={route.view} />}
          {route.section === "voluntarios" && <VolunteersSection />}
        </main>

        {loginOpen && (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.identity.title}
            onClick={(e) => {
              if (e.target === e.currentTarget) setLoginOpen(false);
            }}
          >
            <div className="modal">
              <button
                className="modal-close"
                aria-label={t.common.close}
                onClick={() => setLoginOpen(false)}
              >
                ×
              </button>
              <IdentityGate onAuthed={() => setLoginOpen(false)} />
            </div>
          </div>
        )}
      </CategoriesCtx.Provider>
    </SessionCtx.Provider>
  );
}
