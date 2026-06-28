// Integración del Web SDK de OneSignal (v16) para notificaciones push.
// El script `OneSignalSDK.page.js` se carga desde index.html; aquí encolamos comandos en
// `OneSignalDeferred` (patrón recomendado por OneSignal).

const APP_ID =
  (import.meta.env.VITE_ONESIGNAL_APP_ID as string) ?? "aae84b7b-a9bd-4a8e-8c03-7dadc067be66";

type OneSignalApi = {
  init: (opts: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
  User: { addTag: (k: string, v: string) => Promise<void> };
  Notifications: { requestPermission: () => Promise<void> };
};

declare global {
  interface Window {
    OneSignalDeferred?: ((os: OneSignalApi) => void | Promise<void>)[];
  }
}

// Envuelve cada operación en try/catch: si OneSignal aún no está configurado para el dominio
// (p. ej. falta el Site URL en el panel), los fallos no rompen la app ni ensucian la consola
// con errores no capturados; el push simplemente no se activa hasta completar la config.
function enqueue(fn: (os: OneSignalApi) => Promise<void>): void {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(async (OneSignal) => {
    try {
      await fn(OneSignal);
    } catch {
      /* OneSignal no configurado / sin permiso: ignorar de forma segura */
    }
  });
}

/** Inicializa OneSignal una vez (llamado al arrancar la app). */
export function initPush(): void {
  enqueue((OneSignal) => OneSignal.init({ appId: APP_ID, allowLocalhostAsSecureOrigin: true }));
}

/** Asocia la suscripción push a la identidad ligera (external_id) tras iniciar sesión. */
export function pushLogin(identityId: string): void {
  enqueue((OneSignal) => OneSignal.login(identityId));
}

export function pushLogout(): void {
  enqueue((OneSignal) => OneSignal.logout());
}

/** Marca/limpia el interés en un rol (segmenta los envíos: donante/transportista/necesitado). */
export function setRoleTag(role: "donor" | "transportista" | "necesitado", on: boolean): void {
  enqueue((OneSignal) => OneSignal.User.addTag(`role_${role}`, on ? "true" : "false"));
}

/** Pide permiso de notificaciones al usuario (debe llamarse tras una interacción explícita). */
export function requestPushPermission(): void {
  enqueue((OneSignal) => OneSignal.Notifications.requestPermission());
}
