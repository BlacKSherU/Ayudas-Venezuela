# Quickstart — Portal de Coordinación de Ayuda

**Feature**: 001-portal-coordinacion-ayuda

Guía para levantar el entorno de desarrollo local y desplegar a Cloudflare.

## Requisitos

- Node.js 20 LTS y npm
- Cuenta de Cloudflare + `wrangler` (`npm i -g wrangler` o vía `npx`)
- Autenticación: `wrangler login`

## Estructura

```
backend/   # Cloudflare Worker: API REST + Durable Object (MapRoom) + D1 + KV
web/       # Frontend Vite + React (Cloudflare Pages) + mapa Leaflet
```

## 1. Instalar dependencias

```bash
npm install            # raíz (workspaces) o en cada paquete
```

## 2. Configurar el backend (Worker)

Bindings esperados en `backend/wrangler.jsonc`:
- D1: `DB` (necesidades, identidades, compromisos, auditoría, reportes)
- Durable Object: `MAP_ROOM` (clase `MapRoom`)
- KV: `CONFIG` (catálogo de insumos, límites)
- Vars/Secrets: `SESSION_SECRET` (firma de cookie), `EMAIL_FROM`

Crear recursos y aplicar migraciones:
```bash
cd backend
wrangler d1 create ayuda-venezuela           # copia el id a wrangler.jsonc
wrangler kv namespace create CONFIG          # copia el id a wrangler.jsonc
wrangler d1 migrations apply ayuda-venezuela --local
npx wrangler secret put SESSION_SECRET
```

Levantar en local:
```bash
wrangler dev          # Worker + D1 local + DO en workerd
```

## 3. Configurar el frontend (Pages)

```bash
cd web
# .env.local
echo "VITE_API_BASE=http://localhost:8787/api/v1" > .env.local
echo "VITE_WS_BASE=ws://localhost:8787/api/v1" >> .env.local
npm run dev           # Vite dev server
```

## 4. Probar el flujo esencial (mapa en tiempo real)

1. Abre el frontend en el navegador (móvil o responsive en DevTools).
2. El **mapa** carga centrado en Venezuela y muestra las necesidades existentes.
3. En otra pestaña, **publica una necesidad** (requiere verificar identidad ligera por OTP).
4. Verifica que la nueva necesidad **aparece en vivo** en el mapa de la primera pestaña
   (≤5 s) sin recargar.
5. **Comprométete** con una necesidad → su estado cambia a "comprometida" para todos.
6. **Confirma entrega** → la necesidad se retira de las vistas activas.

## 5. Pruebas

```bash
# Backend (unit + integración sobre Workers/D1/DO)
cd backend && npm test

# E2E del mapa y flujos críticos (incluye viewport móvil y sin geolocalización)
cd web && npm run test:e2e
```

## 6. Despliegue

```bash
# Backend (Worker + DO + D1 + KV)
cd backend
wrangler d1 migrations apply ayuda-venezuela --remote
wrangler deploy

# Frontend (Pages)
cd web
npm run build
wrangler pages deploy dist --project-name ayuda-venezuela
```

Tras desplegar, fija en Pages las variables `VITE_API_BASE`/`VITE_WS_BASE` apuntando al
Worker desplegado y restringe CORS del Worker al dominio de Pages.

## Verificación de constitución (checklist rápido)

- [ ] El mapa es visible **sin iniciar sesión** (FR-009).
- [ ] La API pública nunca devuelve dirección exacta (coordenadas ofuscadas).
- [ ] `contactPublic` solo se guarda con consentimiento explícito.
- [ ] Interfaz en **español**, usable en móvil sin scroll horizontal.
- [ ] Sin mapa/sin geolocalización, la **lista** de necesidades sigue siendo utilizable.
- [ ] Actualizaciones en vivo ≤5 s; degradación a polling si no hay WebSocket.
