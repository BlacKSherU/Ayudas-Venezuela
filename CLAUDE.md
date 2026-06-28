<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-portal-coordinacion-ayuda/plan.md`

Stack: Cloudflare Workers (Hono) + Pages, D1, Durable Objects (WebSocket Hibernation),
KV. Frontend Vite + React + Leaflet (tras abstracción `MapEngine`, migrable a MapLibre).
Pieza central: mapa interactivo en tiempo real. Idioma: español. Mobile-first, WCAG 2.1 AA.
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
