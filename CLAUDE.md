<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/004-secciones-roles-login/plan.md` (feature activa)
Planes previos: `specs/001-portal-coordinacion-ayuda/plan.md`,
`specs/002-roles-logistica-entregas/plan.md`,
`specs/003-catalogo-productos-inventario/plan.md`

Stack: Cloudflare Workers (Hono) + Pages, D1, Durable Objects (WebSocket Hibernation),
KV, R2. Frontend Vite + React + Leaflet (`MapEngine`) + lucide-react (iconos).
Feature 1: mapa en tiempo real (desplegado). Feature 2: roles/personal de apoyo, órdenes de
entrega, incidencias, rastreo en vivo, reputación; cédula/ubicación exacta cifradas AES-GCM;
push OneSignal; OTP por correo (SMTP) y WhatsApp (WaSender vía cola DO con rate-limit).
Feature 3: catálogo de productos con buscador y deduplicación, inventario público
por usuario con libro de movimientos inmutable (custodia 2 pasos), unidades+conversiones,
vista de distribución, y normalización del modelo de datos (desplegada).
Feature 4 (activa): reorganización en 4 secciones (Mapa, Centros de acopio, Necesitados,
Voluntarios) con login único global, selector de rol de voluntario, y entidad centro de
acopio (ubicación exacta pública en el mapa). Idioma: español. Mobile-first,
WCAG 2.1 AA. Dominio: unionvzla.com. Despliegue en Cloudflare.
<!-- SPECKIT END -->

## Reglas de interacción

- OBLIGATORIO: Cuando necesites hacer una pregunta o pedir una decisión a la persona
  usuaria, usa SIEMPRE la interfaz de preguntas estructurada de Claude (el componente de
  selección de opciones). NUNCA hagas la pregunta como texto libre en el chat.
- Esto aplica a toda pregunta: aclaraciones de spec, elección entre alternativas de diseño,
  confirmaciones de alcance y cualquier decisión que corresponda a la persona usuaria.
- Solo pregunta cuando la decisión sea genuinamente de la persona y no exista un valor por
  defecto razonable; de lo contrario, decide y comunícalo.
- Ver la sección "Interacción del Asistente y Toma de Decisiones" en
  `.specify/memory/constitution.md`.
