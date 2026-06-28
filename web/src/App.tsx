import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./lib/api";
import { pushLogin } from "./lib/push";
import type { Category } from "./lib/types";
import { t } from "./i18n";
import { MapPage } from "./pages/MapPage";
import { PublishPage } from "./pages/PublishPage";
import { MyNeedsPage } from "./pages/MyNeedsPage";
import { DonatePage } from "./pages/DonatePage";
import { DeliverPage } from "./pages/DeliverPage";
import { InventoryPage } from "./pages/InventoryPage";
import { DistributionPage } from "./pages/DistributionPage";
import { PublicLedgerPage } from "./pages/PublicLedgerPage";

type Route =
  | "map"
  | "publish"
  | "mine"
  | "donate"
  | "deliver"
  | "inventory"
  | "distribution"
  | "ledger";

const ROUTES: Route[] = [
  "map",
  "publish",
  "mine",
  "donate",
  "deliver",
  "inventory",
  "distribution",
  "ledger",
];

function currentRoute(): Route {
  const h = window.location.hash.replace("#/", "").split("?")[0] as Route;
  return ROUTES.includes(h) ? h : "map";
}

// --- Contextos compartidos -------------------------------------------------

interface SessionState {
  identityId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}
const SessionCtx = createContext<SessionState>({
  identityId: null,
  loading: true,
  refresh: async () => {},
});
export const useSession = () => useContext(SessionCtx);

const CategoriesCtx = createContext<Category[]>([]);
export const useCategories = () => useContext(CategoriesCtx);

// --- App -------------------------------------------------------------------

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute());
  const [identityId, setIdentityId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
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

  const go = (r: Route) => {
    window.location.hash = `#/${r}`;
    setRoute(r);
  };

  return (
    <SessionCtx.Provider value={{ identityId, loading: loadingSession, refresh }}>
      <CategoriesCtx.Provider value={categories}>
        <a className="skip-link" href="#main">
          Saltar al contenido
        </a>
        <header className="app-bar">
          <h1>{t.appName}</h1>
          <p>{t.tagline}</p>
        </header>
        <nav className="tabs" aria-label="Secciones">
          <button onClick={() => go("map")} aria-current={route === "map" ? "page" : undefined}>
            {t.nav.map}
          </button>
          <button
            onClick={() => go("publish")}
            aria-current={route === "publish" ? "page" : undefined}
          >
            {t.nav.publish}
          </button>
          <button onClick={() => go("donate")} aria-current={route === "donate" ? "page" : undefined}>
            Donar
          </button>
          <button onClick={() => go("deliver")} aria-current={route === "deliver" ? "page" : undefined}>
            Llevar
          </button>
          <button onClick={() => go("inventory")} aria-current={route === "inventory" ? "page" : undefined}>
            Inventario
          </button>
          <button onClick={() => go("distribution")} aria-current={route === "distribution" ? "page" : undefined}>
            Distribución
          </button>
          <button onClick={() => go("ledger")} aria-current={route === "ledger" ? "page" : undefined}>
            Transparencia
          </button>
          <button onClick={() => go("mine")} aria-current={route === "mine" ? "page" : undefined}>
            {t.nav.mine}
          </button>
        </nav>
        <main id="main">
          {route === "map" && <MapPage />}
          {route === "publish" && <PublishPage onPublished={() => go("map")} />}
          {route === "donate" && <DonatePage />}
          {route === "deliver" && <DeliverPage />}
          {route === "inventory" && <InventoryPage />}
          {route === "distribution" && <DistributionPage />}
          {route === "ledger" && <PublicLedgerPage />}
          {route === "mine" && <MyNeedsPage />}
        </main>
      </CategoriesCtx.Provider>
    </SessionCtx.Provider>
  );
}
