# Phase 0 Research: Portal de Coordinación de Ayuda

**Fecha**: 2026-06-27 | **Feature**: 001-portal-coordinacion-ayuda

Este documento resuelve las decisiones técnicas (incluidas las marcadas como NEEDS
CLARIFICATION en el contexto técnico) para habilitar el diseño de la Fase 1.

## D1. Motor de mapa interactivo (decisión central del proyecto)

- **Decision**: Leaflet + tiles raster de OpenStreetMap para el MVP, encapsulado tras una
  interfaz `MapEngine` que abstrae operaciones (montar mapa, fijar vista, añadir/quitar/
  actualizar marcadores y zonas, eventos de viewport). Una segunda implementación con
  MapLibre GL (vectorial) podrá añadirse después sin tocar la lógica de la app.
- **Rationale**: La constitución prioriza mobile-first y rendimiento en 3G (SC-004, ≤3 s).
  Leaflet (~40 KB) con tiles raster es ligero, estable, gratuito y consume menos en redes
  degradadas que el render vectorial GPU. La abstracción `MapEngine` evita el acoplamiento y
  permite la "interfaz moderna" vectorial cuando el contexto de red lo permita.
- **Alternatives considered**:
  - MapLibre GL (vectorial) ahora: más fluido y moderno pero ~200 KB+ y requiere hospedar/
    pagar tiles vectoriales; peor ajuste al presupuesto 3G inicial.
  - Servicios propietarios (Google/Mapbox): costo y dependencia que choca con "gratuito y de
    libre uso" y "costo mínimo".
- **Notas de implementación**: Respetar la política de uso de tiles de OSM (atribución
  visible, sin scraping masivo); evaluar un proveedor de tiles gratuito/propio si el volumen
  lo exige. Cargar el mapa con `import()` diferido (code-splitting).

## D2. Tiempo real (núcleo de "en vivo")

- **Decision**: Durable Objects con **WebSocket Hibernation API**. Un DO por región
  (estado de Venezuela) actúa como "MapRoom": mantiene las conexiones WebSocket de los
  clientes que observan esa región y difunde eventos `need.created|updated|closed`. El
  Worker, al confirmar una escritura en D1, notifica al DO de la región afectada, que
  retransmite a sus clientes.
- **Rationale**: Los DO ofrecen estado coordinado y fan-out de baja latencia en el borde,
  exactamente lo que pide el Principio IV (≤5 s). La Hibernation API permite mantener
  decenas de miles de conexiones inactivas sin costo de cómputo continuo, habilitando
  SC-007 (10.000 concurrentes) con sharding por región.
- **Alternatives considered**:
  - Polling REST periódico: simple pero no cumple ≤5 s con eficiencia y escala mal a 10k.
  - Un único DO global: cuello de botella y límite de conexiones; el sharding por región
    distribuye carga y acota la difusión al viewport relevante.
  - SSE: unidireccional y con peor soporte de reconexión móvil que WS sobre DO.
- **Notas**: El cliente se suscribe a la(s) región(es) de su viewport; al hacer
  pan/zoom mayor cambia de MapRoom. Snapshot inicial vía REST (bounding box) + stream de
  deltas por WS.

## D3. Persistencia y consultas geográficas

- **Decision**: D1 (SQLite) como almacén principal. Las necesidades guardan coordenadas de
  zona ofuscadas (lat/lng redondeadas a una rejilla ~1 km). Las consultas del mapa usan
  filtros por **bounding box** (rangos de lat/lng indexados) más estado y categoría.
- **Rationale**: D1 es el almacenamiento relacional nativo de Cloudflare, suficiente para el
  volumen previsto. El bounding box sobre columnas indexadas es simple y rápido sin
  extensiones geoespaciales.
- **Alternatives considered**:
  - KV como principal: sin consultas por rango; inadecuado para filtrado geográfico.
  - Índices geohash: útil a mayor escala; se difiere (YAGNI) — el bounding box basta para el
    MVP y se puede añadir una columna geohash luego sin migración disruptiva.
- **Privacidad**: nunca se almacena la dirección exacta del hogar para la vista pública; si
  en el futuro se capta una ubicación precisa para la entrega, se guarda separada y cifrada,
  fuera de la API pública (Principio I).

## D4. Identidad ligera y gestión de publicaciones

- **Decision**: Identidad ligera opcional por teléfono o correo, verificada con un código de
  un solo uso (OTP) enviado por Cloudflare Email (correo) en el MVP. Sesión mediante cookie
  firmada (HMAC) con expiración. Cada necesidad se asocia a la identidad que la creó; solo
  esa identidad (o la persona donante comprometida, para confirmar entrega) puede gestionarla.
- **Rationale**: Cumple FR-001/FR-018 (gestión controlada) sin imponer una cuenta compleja,
  respetando el Principio III (baja fricción) y el I (datos mínimos). El OTP evita
  contraseñas y reduce datos almacenados.
- **Alternatives considered**:
  - Sin identidad (edición abierta): descartado por el usuario (riesgo de manipulación).
  - OAuth/redes sociales: añade dependencia y fricción; choca con minimización de datos.
  - SMS OTP: deseable por alcance móvil, pero depende de un proveedor de SMS de pago; se
    difiere a una mejora posterior (correo primero por costo cero).

## D5. Anti-abuso (veracidad sin verificación previa)

- **Decision**: Publicación sin verificación previa (FR-017) + controles posteriores:
  (a) límites de tasa por IP/identidad usando KV con TTL; (b) detección de duplicados por
  similitud (misma zona + categoría + ventana temporal); (c) reportes comunitarios que
  marcan una necesidad para revisión/ocultamiento tras un umbral.
- **Rationale**: Equilibra rapidez de acceso urgente (Principios II/III) con veracidad
  (Principio IV) sin bloquear a quien más lo necesita.
- **Alternatives considered**: CAPTCHA obligatorio (fricción y exclusión) — se reserva como
  defensa opcional ante abuso elevado (p. ej. Cloudflare Turnstile) en lugar de por defecto.

## D6. Frontend mobile-first y rendimiento

- **Decision**: Vite + React 18 + TypeScript; shell ligero con el mapa cargado de forma
  diferida; lista accesible de necesidades como fallback (sin mapa/sin geolocalización);
  i18n en español; componentes accesibles (roles ARIA, foco, contraste) hacia WCAG 2.1 AA.
- **Rationale**: Vite + React es un stack moderno con buen tooling y despliegue directo en
  Pages; el code-splitting del mapa protege el presupuesto 3G (SC-004) y la lista de
  fallback cumple la degradación elegante (FR-012) y la accesibilidad.
- **Alternatives considered**:
  - SvelteKit/Preact: bundles aún menores; se mantiene React por familiaridad y ecosistema,
    controlando el peso con carga diferida y presupuesto de bundle. La capa `MapEngine`
    y el cliente REST/WS quedan desacoplados del framework por si se cambia luego.

## D7. Topología de despliegue Cloudflare (Workers + Pages)

- **Decision**: Frontend en **Cloudflare Pages**; backend (API REST + Durable Objects + D1 +
  KV) en un **Cloudflare Worker** independiente. Comunicación por HTTPS/WSS con CORS acotado
  al dominio de Pages. Migraciones de D1 versionadas en `backend/migrations`.
- **Rationale**: Refleja literalmente la restricción de la constitución ("Workers y Pages"),
  separa responsabilidades y permite escalar/observar cada parte por separado.
- **Alternatives considered**:
  - Todo en un Worker con assets estáticos: válido y más simple, pero el usuario/constitución
    nombran explícitamente Pages; la separación también clarifica límites de despliegue.
  - Pages Functions para la API: posible, pero los Durable Objects viven mejor en un Worker
    dedicado; se evita acoplar el realtime al ciclo de build de Pages.

## D8. Observabilidad y operación

- **Decision**: Logs estructurados en el Worker y el DO (evento, región, estado, sin datos
  personales); métricas vía Workers Analytics/Logpush; alarmas de Durable Object para tareas
  programadas (auto-liberar compromisos a las 12 h, expirar necesidades a los 30 días).
- **Rationale**: Cumple la expectativa de auditoría del Principio IV y automatiza FR-007 y
  FR-019 sin un cron externo, aprovechando las alarmas de DO.
- **Alternatives considered**: Cron Triggers del Worker (válido para barridos globales); se
  prefieren alarmas de DO por precisión por entidad/región, con un Cron de respaldo para
  barridos de expiración.

## Resumen de decisiones

| # | Tema | Decisión |
|---|------|----------|
| D1 | Motor de mapa | Leaflet+OSM tras `MapEngine`; MapLibre vectorial después |
| D2 | Tiempo real | Durable Objects + WebSocket Hibernation, sharding por región |
| D3 | Persistencia/geo | D1 con coordenadas ofuscadas y consultas por bounding box |
| D4 | Identidad | Identidad ligera opcional (OTP por correo), sesión por cookie firmada |
| D5 | Anti-abuso | Sin verificación previa + rate limit (KV) + dedupe + reportes |
| D6 | Frontend | Vite+React, mapa diferido, fallback de lista, WCAG AA, español |
| D7 | Despliegue | Frontend en Pages, backend (API+DO+D1+KV) en Worker |
| D8 | Observabilidad | Logs estructurados + alarmas de DO para 12 h / 30 d |

**Estado**: Todas las incógnitas resueltas. Listo para Fase 1 (diseño y contratos).
