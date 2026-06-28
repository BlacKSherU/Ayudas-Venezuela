# Ayuda Venezuela

Portal humanitario, **público y de libre uso**, para coordinar la distribución de insumos
tras el terremoto en Venezuela. Conecta directamente a personas **donantes** con personas
**necesitadas**, sin intermediarios, mediante un **mapa interactivo en tiempo real**.

> Proyecto de respuesta a emergencia. Privacidad por diseño, mobile-first, gratuito y de
> código abierto (MIT). Ver la [constitución del proyecto](.specify/memory/constitution.md).

## Arquitectura

- **Frontend** (`web/`): Vite + React + TypeScript, desplegado en **Cloudflare Pages**.
  Mapa con Leaflet + OpenStreetMap tras una abstracción `MapEngine` (migrable a MapLibre).
- **Backend** (`backend/`): **Cloudflare Worker** (Hono) con **D1** (datos), **Durable
  Objects** para tiempo real (WebSocket Hibernation) y **KV** (catálogo/configuración).

La pieza central es el **mapa en tiempo real**: las necesidades aparecen y cambian de estado
en vivo (≤5 s) para todas las personas conectadas.

## Estructura

```
backend/   Worker: API REST + Durable Object (MapRoom) + D1 + KV
web/       Frontend: Vite + React + Leaflet (Cloudflare Pages)
specs/     Especificación, plan, contratos y tareas (Spec Kit)
```

## Desarrollo

Ver la guía completa en
[`specs/001-portal-coordinacion-ayuda/quickstart.md`](specs/001-portal-coordinacion-ayuda/quickstart.md).

```bash
npm install
npm run dev:backend   # Worker local (wrangler dev)
npm run dev:web       # Frontend (Vite)
```

## Principios no negociables

1. **Dignidad y protección** de las personas: ubicación pública ofuscada por zona; contacto
   público solo si la persona lo sube con consentimiento; datos mínimos.
2. **Acceso directo** donante↔necesitado, sin intermediarios ni comisiones.
3. **Mobile-first**, accesible (WCAG 2.1 AA) y resiliente a baja conectividad.
4. **Tiempo real**, veracidad y auditabilidad.
5. **Abierto, público y gratuito**.

## Licencia

[MIT](LICENSE).
