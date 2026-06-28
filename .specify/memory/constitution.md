<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump rationale: Adición de una nueva sección de gobernanza sobre la interacción del
asistente (preguntas mediante interfaz estructurada). Adición material de guía → MINOR.

Modified principles: ninguno
Added principles: ninguno
Added sections:
  - Interacción del Asistente y Toma de Decisiones (v1.1.0)
Previously added (v1.0.0):
  - Principios I–V; Restricciones Técnicas y de Plataforma;
    Flujo de Desarrollo y Puertas de Calidad; Governance

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check es genérico; deriva
       automáticamente de este archivo — sin cambios necesarios)
  - ✅ .specify/templates/spec-template.md (sin referencias a principios codificadas)
  - ✅ .specify/templates/tasks-template.md (sin referencias a principios codificadas)
  - ✅ CLAUDE.md (regla de preguntas vía interfaz estructurada añadida)

Follow-up TODOs: ninguno.
-->

# Constitución de Ayuda Venezuela

Portal humanitario de coordinación de distribución de insumos para la respuesta al
terremoto que devastó Venezuela. Conecta de forma directa a personas donantes con
personas necesitadas mediante un mapa interactivo en tiempo real, sin intermediarios.

## Core Principles

### I. Dignidad y Protección de las Personas (NO NEGOCIABLE)

Las personas necesitadas son seres humanos en situación de vulnerabilidad, no datos de
mercadeo. Toda decisión de diseño, producto o ingeniería DEBE priorizar su seguridad,
privacidad y dignidad por encima de cualquier otra consideración.

Reglas no negociables:
- Los datos personales sensibles (ubicación exacta del hogar, nombres completos,
  contacto, fotos de personas) DEBEN minimizarse, recolectarse solo cuando son
  estrictamente necesarios para la entrega de ayuda, y nunca exponerse públicamente sin
  consentimiento explícito e informado.
- La ubicación de necesitados en el mapa público DEBE ofuscarse o agregarse (p. ej.
  radio/zona aproximada) hasta que exista un emparejamiento confirmado con un donante.
- El sistema DEBE permitir borrar o anonimizar los datos de una persona a solicitud, y
  no DEBE retener datos personales más allá del propósito humanitario que los justificó.
- NUNCA se monetizan, venden ni ceden los datos de las personas a terceros.

**Justificación**: En una catástrofe, exponer la ubicación o identidad de personas
vulnerables puede facilitar robos, extorsión o violencia. La protección de la persona es
la razón de ser del proyecto y prevalece sobre la conveniencia técnica.

### II. Acceso Directo Sin Intermediarios

El propósito central del portal es que quien dona lleve lo necesario directamente a quien
lo necesita. La arquitectura del producto NO DEBE introducir intermediarios obligatorios,
cuellos de botella de aprobación, ni captura de valor entre donante y receptor.

Reglas:
- El flujo donante→necesitado DEBE poder completarse sin la intervención manual de un
  operador central para cada entrega.
- Cualquier funcionalidad de moderación, verificación o coordinación DEBE existir para
  proteger y habilitar la conexión directa, nunca para condicionarla con peajes ni
  comisiones.
- El emparejamiento DEBE basarse en proximidad geográfica y compatibilidad de
  necesidad/insumo para minimizar fricción logística.

**Justificación**: Eliminar intermediarios reduce demoras, costos y oportunidades de
desvío de la ayuda, que son críticos en las primeras horas y días tras el desastre.

### III. Mobile-First, Accesible y Resiliente a Baja Conectividad

La mayoría de las personas accederán desde teléfonos móviles, en condiciones de red
degradadas y energía intermitente típicas de una zona de desastre. La interfaz DEBE
diseñarse primero para móvil y para funcionar en lo mínimo viable.

Reglas:
- Diseño mobile-first y responsivo: cada vista DEBE ser plenamente usable en pantallas
  pequeñas antes de optimizarse para escritorio.
- Las páginas críticas (registro de necesidad, registro de donación, mapa) DEBEN cargar
  con presupuestos de rendimiento ajustados a redes lentas (objetivo: interacción útil
  en ≤3 s en 3G); el peso inicial DEBE mantenerse al mínimo.
- La interfaz DEBE cumplir accesibilidad WCAG 2.1 nivel AA como objetivo (contraste,
  navegación por teclado, etiquetas, lectores de pantalla).
- El contenido y la interfaz DEBEN estar en español como idioma primario.
- Se DEBE degradar con elegancia ante fallos de mapa, geolocalización o red, sin dejar a
  la persona sin una vía de acción.

**Justificación**: Una herramienta que no funciona en un teléfono modesto con mala señal
es inútil para quienes más la necesitan.

### IV. Confianza, Veracidad y Tiempo Real

El valor del portal depende de que la información de necesidades y disponibilidad sea
veraz y oportuna. El sistema DEBE proteger la integridad de los datos y reflejar el
estado real en tiempo real.

Reglas:
- El estado de necesidades e insumos (pendiente, emparejado, entregado) DEBE actualizarse
  en tiempo real para todas las personas conectadas relevantes.
- DEBEN existir mecanismos contra abuso y spam (p. ej. verificación ligera, límites de
  tasa, detección de duplicados) que no obstaculicen el acceso legítimo y urgente.
- Las necesidades atendidas DEBEN poder marcarse como resueltas para evitar duplicación
  de esfuerzos y saturación de un mismo punto.
- Las acciones que modifican el estado DEBEN ser auditables (quién/qué/cuándo) sin
  exponer datos personales en los registros públicos.

**Justificación**: Datos falsos, obsoletos o duplicados desperdician recursos escasos y
erosionan la confianza de donantes, de la que depende toda la operación.

### V. Abierto, Público y Gratuito

El portal es un bien común para la respuesta a la emergencia. DEBE ser de acceso público,
de uso libre y sin barreras económicas.

Reglas:
- El uso del portal DEBE ser gratuito para donantes y necesitados; NUNCA se cobra por
  registrar una necesidad, una donación o por concretar una entrega.
- El código fuente DEBE publicarse bajo una licencia de código abierto que permita su
  reutilización y auditoría por la comunidad.
- No DEBE existir un muro de inicio de sesión que impida ver el mapa público y la
  información agregada de necesidades (respetando el Principio I).
- Las decisiones de diseño DEBEN favorecer la operación a costo mínimo para garantizar la
  sostenibilidad sin financiamiento garantizado.

**Justificación**: Una respuesta humanitaria efectiva exige máxima difusión, transparencia
y cero barreras de entrada; el código abierto permite confianza, auditoría y continuidad.

## Restricciones Técnicas y de Plataforma

- **Despliegue**: La aplicación DEBE desplegarse sobre Cloudflare —Workers para lógica de
  backend/API y Pages para el frontend—. El almacenamiento DEBE usar servicios de
  Cloudflare (p. ej. D1, KV, R2, Durable Objects) según el caso de uso.
- **Edge-first**: La lógica DEBE diseñarse para el modelo de ejecución en el borde
  (stateless donde sea posible, estado coordinado vía Durable Objects para tiempo real).
- **Tiempo real**: Las actualizaciones en vivo del mapa y de estados DEBEN implementarse
  con mecanismos compatibles con Cloudflare (p. ej. WebSockets sobre Durable Objects).
- **Costo**: La arquitectura DEBE priorizar permanecer dentro de niveles de bajo costo o
  gratuitos siempre que sea compatible con la fiabilidad requerida.
- **Privacidad por diseño**: Las decisiones de almacenamiento y APIs DEBEN aplicar
  minimización de datos y ofuscación de ubicación conforme al Principio I.

## Flujo de Desarrollo y Puertas de Calidad

- **Prioridad de entrega**: Dado el contexto de emergencia, se favorece la entrega rápida
  de valor seguro. La velocidad NUNCA justifica violar el Principio I ni el V.
- **Pruebas**: Las rutas críticas (crear necesidad, crear donación, emparejar, marcar
  entregado, ofuscación de ubicación) DEBEN cubrirse con pruebas automatizadas antes de
  considerarse listas para producción.
- **Revisión**: Todo cambio DEBE verificar el cumplimiento de esta constitución; cualquier
  violación DEBE justificarse explícitamente o ser rechazada.
- **Responsividad y accesibilidad**: Las vistas nuevas DEBEN validarse en viewport móvil y
  contra criterios de accesibilidad antes de fusionarse.
- **Simplicidad (YAGNI)**: Se prefiere la solución más simple que satisface el requisito;
  la complejidad añadida DEBE justificarse frente a una alternativa más simple.

## Interacción del Asistente y Toma de Decisiones

Esta sección rige cómo cualquier asistente de IA (p. ej. Claude) interactúa con las
personas del proyecto durante el desarrollo.

- **Preguntas mediante interfaz estructurada (OBLIGATORIO)**: Cuando el asistente necesite
  hacer una pregunta o solicitar una decisión a la persona usuaria, DEBE usar SIEMPRE la
  interfaz de preguntas estructurada de Claude (componente de selección de opciones).
  NUNCA DEBE formular la pregunta como texto libre en el chat.
- Esto aplica a toda pregunta: aclaraciones de especificación, elección entre alternativas
  de diseño, confirmaciones de alcance y cualquier decisión que corresponda a la persona.
- Las opciones presentadas DEBEN ser claras y mutuamente excluyentes, con una recomendación
  cuando exista una opción preferida, y DEBEN permitir una respuesta personalizada.
- El asistente solo DEBE preguntar cuando la decisión es genuinamente de la persona y no
  puede resolverse con un valor por defecto razonable; en caso contrario, decide y lo
  informa.

**Justificación**: Una interfaz de preguntas estructurada reduce la ambigüedad, agiliza la
respuesta de las personas en un contexto de emergencia y deja un registro claro de las
decisiones tomadas.

## Governance

Esta constitución prevalece sobre cualquier otra práctica o preferencia técnica. Ante un
conflicto entre un principio y una conveniencia de implementación, el principio gana.

- **Enmiendas**: Toda modificación DEBE documentarse en este archivo, con justificación y
  actualización de la versión. Los cambios que afecten plantillas dependientes DEBEN
  propagarse en el mismo cambio.
- **Versionado**: Se aplica versionado semántico a esta constitución:
  - MAJOR: eliminación o redefinición incompatible de principios o gobernanza.
  - MINOR: adición de un principio/sección o expansión material de la guía.
  - PATCH: aclaraciones, redacción y refinamientos no semánticos.
- **Cumplimiento**: Todas las revisiones de cambios (PRs) DEBEN verificar el cumplimiento
  de los principios. Las violaciones no justificadas bloquean la fusión.
- **Revisión periódica**: La constitución DEBE revisarse cuando cambie sustancialmente el
  alcance del proyecto o la fase de la emergencia.

**Version**: 1.1.0 | **Ratified**: 2026-06-27 | **Last Amended**: 2026-06-27
