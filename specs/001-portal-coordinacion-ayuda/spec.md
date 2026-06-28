# Feature Specification: Portal de Coordinación de Ayuda

**Feature Branch**: `001-portal-coordinacion-ayuda`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Portal humanitario en apoyo a la catástrofe del terremoto que devastó Venezuela. Coordina la distribución de insumos manejando donantes y necesitados, con un mapa interactivo en tiempo real, para que los donantes lleven directamente lo necesario a los necesitados sin intermediarios. Interfaz moderna, responsiva, mobile-first, pública y de libre uso."

## Clarifications

### Session 2026-06-27

- Q: Sin cuentas obligatorias, ¿cómo se controla quién puede editar o cerrar una necesidad
  ya publicada? → A: Registro ligero opcional (identidad simple por teléfono/correo)
  asociada a cada publicación; solo esa identidad puede gestionarla.
- Q: ¿Alcance geográfico inicial del portal? → A: Todo Venezuela.
- Q: ¿Tras cuánto tiempo una necesidad "comprometida" sin confirmación vuelve a
  "pendiente"? → A: 12 horas.
- Q: ¿Cuánto permanece visible una necesidad antes de expirar por inactividad? → A: Expira
  a los 30 días.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publicar una necesidad (Priority: P1)

Una persona afectada por el terremoto (o alguien en su nombre) entra al portal desde su
teléfono y publica qué insumos necesita (p. ej. agua, alimentos, medicinas, pañales) y en
qué zona aproximada se encuentra, sin tener que crear una cuenta compleja ni revelar su
dirección exacta públicamente.

**Why this priority**: Sin necesidades publicadas no hay nada que coordinar. Es la base
del sistema y, por sí sola, ya genera valor al hacer visible dónde y qué se necesita.

**Independent Test**: Se puede probar de forma independiente publicando una necesidad y
verificando que queda registrada y visible (con ubicación ofuscada) para otras personas,
incluso si todavía no existe ningún donante.

**Acceptance Scenarios**:

1. **Given** una persona en una zona afectada, **When** completa el formulario con tipo de
   insumo, cantidad/urgencia y zona aproximada, **Then** la necesidad queda registrada con
   estado "pendiente" y aparece en el mapa con ubicación ofuscada.
2. **Given** un formulario de necesidad incompleto (sin tipo de insumo o sin zona),
   **When** la persona intenta enviarlo, **Then** el sistema impide el envío e indica con
   claridad qué falta.
3. **Given** una necesidad ya atendida, **When** la persona la marca como resuelta,
   **Then** deja de mostrarse como pendiente para no atraer más donaciones duplicadas.

---

### User Story 2 - Explorar el mapa y encontrar necesidades cercanas (Priority: P1)

Una persona donante abre el portal y ve un mapa interactivo con las necesidades cercanas a
su ubicación, actualizándose en tiempo real. Puede filtrar por tipo de insumo y urgencia
para decidir a quién ayudar directamente.

**Why this priority**: Es la cara visible del portal y el mecanismo de descubrimiento que
conecta la oferta con la demanda. Junto con la Historia 1 conforma el MVP del flujo
directo donante→necesitado.

**Independent Test**: Se puede probar de forma independiente cargando el mapa con
necesidades existentes y verificando que se muestran, se filtran y se actualizan en vivo
cuando aparece o cambia una necesidad, sin requerir inicio de sesión.

**Acceptance Scenarios**:

1. **Given** existen necesidades pendientes, **When** la persona donante abre el mapa,
   **Then** ve las necesidades como puntos/zonas en el mapa centrado en su ubicación
   aproximada (o en una zona por defecto si no comparte ubicación).
2. **Given** el mapa abierto, **When** se publica una nueva necesidad por otra persona,
   **Then** aparece en el mapa en tiempo real sin necesidad de recargar la página.
3. **Given** el mapa con muchas necesidades, **When** la persona filtra por tipo de insumo
   o urgencia, **Then** el mapa muestra solo las que coinciden.
4. **Given** una conexión lenta o sin permiso de ubicación, **When** carga el mapa,
   **Then** la vista degrada con elegancia mostrando una zona por defecto y una lista
   alternativa de necesidades.

---

### User Story 3 - Comprometerse a atender una necesidad (Priority: P2)

Una persona donante elige una necesidad y se compromete a atenderla. El sistema marca esa
necesidad como "en camino/comprometida" para que otras personas no dupliquen el esfuerzo,
y habilita un canal para coordinar la entrega directa respetando la privacidad de ambas
partes.

**Why this priority**: Convierte el descubrimiento en acción concreta y evita la
duplicación de esfuerzos. Depende de las Historias 1 y 2.

**Independent Test**: Se puede probar seleccionando una necesidad pendiente, marcándola
como comprometida y verificando que su estado cambia para todas las personas y que se
habilita el medio de coordinación acordado.

**Acceptance Scenarios**:

1. **Given** una necesidad pendiente, **When** una persona donante se compromete a
   atenderla, **Then** la necesidad cambia a estado "comprometida" y deja de aparecer como
   pendiente para nuevos donantes.
2. **Given** una necesidad comprometida, **When** transcurren 12 horas sin confirmación de
   entrega, **Then** el sistema la devuelve automáticamente a "pendiente" para no
   bloquearla indefinidamente.
3. **Given** dos personas donantes intentan comprometerse con la misma necesidad casi al
   mismo tiempo, **When** la segunda confirma, **Then** el sistema informa que ya fue
   tomada y le sugiere necesidades alternativas.

---

### User Story 4 - Confirmar entrega y cerrar la necesidad (Priority: P2)

Cuando la ayuda llega a destino, la necesidad se marca como "entregada/resuelta" para
reflejar el estado real, liberar el mapa y permitir medir el impacto de la coordinación.

**Why this priority**: Cierra el ciclo y mantiene la veracidad de los datos, evitando que
el mapa se sature de necesidades ya cubiertas. Depende de la Historia 3.

**Independent Test**: Se puede probar marcando una necesidad comprometida como entregada y
verificando que desaparece de las vistas de pendientes y se contabiliza como resuelta.

**Acceptance Scenarios**:

1. **Given** una necesidad comprometida, **When** se confirma la entrega, **Then** la
   necesidad pasa a estado "entregada" y se retira de las vistas activas del mapa.
2. **Given** una necesidad entregada, **When** se consultan estadísticas públicas,
   **Then** se refleja en el conteo de necesidades resueltas sin exponer datos personales.

---

### Edge Cases

- ¿Qué ocurre cuando una persona publica la misma necesidad varias veces (duplicados) o
  cuando dos personas reportan la misma necesidad de una zona?
- ¿Cómo se maneja una necesidad falsa, spam o malintencionada que busca desviar ayuda?
- ¿Qué pasa si una persona donante se compromete pero nunca entrega? (necesidad bloqueada)
- ¿Cómo se comporta el sistema sin permiso de geolocalización o con ubicación imprecisa?
- ¿Qué se muestra cuando no hay ninguna necesidad cercana a la persona donante?
- ¿Cómo se protege la ubicación exacta del hogar antes de que exista un emparejamiento?
- ¿Qué ocurre con conectividad intermitente o pérdida de conexión durante el uso del mapa?
- ¿Cómo se evita que una misma necesidad urgente sea ignorada por aparecer muy abajo en
  una lista larga?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir publicar una necesidad indicando tipo de insumo,
  cantidad o nivel de urgencia y zona geográfica aproximada, mediante un registro ligero
  (p. ej. teléfono o correo), sin exigir una cuenta compleja ni la dirección exacta en la
  publicación pública.
- **FR-002**: El sistema MUST mostrar las necesidades en un mapa interactivo, ubicándolas
  por zona aproximada y nunca por la dirección exacta mientras estén en estado pendiente.
- **FR-003**: El sistema MUST actualizar el mapa y los estados de las necesidades en tiempo
  real para todas las personas conectadas relevantes, sin requerir recarga manual.
- **FR-004**: Las personas usuarias MUST poder filtrar las necesidades del mapa por tipo de
  insumo y por nivel de urgencia.
- **FR-005**: El sistema MUST permitir que una persona donante se comprometa con una
  necesidad, cambiando su estado a "comprometida" de forma exclusiva (una sola persona
  donante activa por necesidad a la vez).
- **FR-006**: El sistema MUST permitir marcar una necesidad como "entregada/resuelta" y
  retirarla de las vistas activas de pendientes.
- **FR-007**: El sistema MUST devolver una necesidad comprometida al estado "pendiente"
  automáticamente si transcurren 12 horas sin confirmación de entrega, para no bloquearla
  indefinidamente.
- **FR-008**: El sistema MUST detectar y mitigar publicaciones duplicadas y spam mediante
  mecanismos que no obstaculicen el acceso legítimo y urgente.
- **FR-009**: El sistema MUST ser de acceso público y permitir consultar el mapa y la
  información agregada de necesidades sin iniciar sesión.
- **FR-010**: El sistema MUST ser gratuito para donantes y necesitados; no MUST cobrar por
  registrar necesidades, donaciones ni por concretar entregas.
- **FR-011**: El sistema MUST minimizar la recolección de datos personales y nunca exponer
  públicamente datos sensibles (nombre completo, contacto, ubicación exacta) sin
  consentimiento explícito de la persona. Subir datos de contacto (FR-016) constituye dicho
  consentimiento explícito para hacerlos públicos; la ubicación exacta del hogar nunca se
  publica.
- **FR-012**: El sistema MUST presentar una interfaz responsiva y mobile-first, plenamente
  usable en teléfonos y degradando con elegancia ante baja conectividad o falta de
  geolocalización.
- **FR-013**: El sistema MUST presentar la interfaz y el contenido en español como idioma
  primario.
- **FR-014**: El sistema MUST registrar de forma auditable los cambios de estado de una
  necesidad (qué cambió y cuándo) sin exponer datos personales en registros públicos.
- **FR-015**: El sistema MUST mantener un conteo público y agregado de necesidades
  resueltas, sin revelar información que identifique a personas.
- **FR-016**: El sistema MUST permitir que la persona (necesitada o donante) suba de forma
  opcional datos de contacto para coordinar la entrega directa. Si la persona decide
  subirlos, dichos datos se muestran públicamente; antes de publicarlos, el sistema MUST
  advertir de forma clara que serán visibles para cualquiera. La coordinación de la entrega
  ocurre por fuera del portal a través de ese contacto. La persona MUST poder editar o
  eliminar sus datos de contacto en cualquier momento.
- **FR-017**: El sistema MUST permitir publicar necesidades sin verificación previa,
  apoyándose en controles anti-abuso aplicados a posteriori (límites de tasa, detección de
  duplicados y reportes comunitarios) para preservar la veracidad sin bloquear el acceso
  urgente.
- **FR-018**: El sistema MUST asociar cada necesidad a la identidad ligera de quien la
  publica, y solo esa identidad (o la persona donante comprometida, para confirmar entrega)
  MUST poder editar, comprometer, cerrar o eliminar esa necesidad. La gestión de una
  publicación requiere haber iniciado sesión con la identidad ligera asociada.
- **FR-019**: El sistema MUST hacer expirar automáticamente una necesidad pendiente que
  permanezca 30 días sin actualización, retirándola de las vistas activas para mantener la
  veracidad del mapa.
- **FR-020**: El sistema MUST operar a escala nacional para Venezuela, centrando por
  defecto el mapa en el país cuando no se dispone de la ubicación aproximada de la persona
  usuaria.

### Key Entities *(include if feature involves data)*

- **Necesidad**: Representa un requerimiento de insumos publicado por una persona afectada.
  Atributos clave: tipo(s) de insumo, cantidad o urgencia, zona geográfica aproximada,
  estado (pendiente, comprometida, entregada), marca temporal de creación y de cambios.
- **Donante**: Persona o grupo que ofrece llevar insumos. Atributos clave: identificación
  mínima necesaria para coordinar, necesidad(es) con las que se ha comprometido. Puede
  operar con datos mínimos respetando la minimización de datos.
- **Necesitado**: Persona afectada que publica una o más necesidades. Sus datos sensibles
  se mantienen protegidos y separados de la vista pública.
- **Identidad ligera**: Identificador simple (p. ej. teléfono o correo) usado para asociar
  publicaciones a su autor y autorizar su gestión (editar, comprometer, cerrar, eliminar),
  sin constituir una cuenta compleja.
- **Insumo (categoría)**: Catálogo de tipos de insumos (agua, alimentos, medicinas,
  higiene, abrigo, etc.) usado para clasificar y filtrar necesidades.
- **Emparejamiento**: Relación entre una necesidad y la persona donante comprometida, con
  su estado y marcas temporales, base para coordinar la entrega y medir el impacto.
- **Zona geográfica**: Representación aproximada de ubicación (área/radio) usada para el
  mapa público, desacoplada de cualquier dirección exacta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede publicar una necesidad completa en menos de 2 minutos desde
  un teléfono móvil.
- **SC-002**: Una persona donante puede, desde que abre el portal, encontrar una necesidad
  cercana relevante y comprometerse con ella en menos de 3 minutos.
- **SC-003**: Las nuevas necesidades y los cambios de estado se reflejan en el mapa de
  otras personas conectadas en menos de 5 segundos.
- **SC-004**: Las páginas críticas (publicar necesidad, mapa) alcanzan interacción útil en
  3 segundos o menos en una conexión móvil lenta (equivalente a 3G).
- **SC-005**: El portal es plenamente utilizable en pantallas de teléfono móvil sin
  desplazamiento horizontal ni pérdida de funciones esenciales.
- **SC-006**: Al menos el 90% de las necesidades comprometidas se cierran (entregadas o
  reabiertas) en lugar de quedar bloqueadas indefinidamente.
- **SC-007**: El portal soporta al menos 10.000 personas usuarias concurrentes consultando
  el mapa sin degradación perceptible.
- **SC-008**: Ninguna vista pública expone la ubicación exacta del hogar de una persona
  necesitada; los datos de contacto solo son visibles cuando la propia persona eligió
  subirlos tras un aviso claro de que serían públicos.

## Assumptions

- El público objetivo accede mayoritariamente desde teléfonos móviles, en condiciones de
  red degradadas y energía intermitente propias de una zona de desastre.
- El idioma primario de las personas usuarias es el español.
- La publicación de necesidades se prioriza con baja fricción mediante un registro ligero
  (p. ej. teléfono o correo), suficiente para gestionar las propias publicaciones sin
  constituir una cuenta compleja; cualquier verificación se diseña para no bloquear el
  acceso urgente.
- El portal opera a escala nacional para Venezuela; el mapa se centra en el país por
  defecto cuando no se dispone de la ubicación aproximada de la persona usuaria.
- Las necesidades pendientes sin actualización expiran a los 30 días y las comprometidas
  sin confirmación se reabren a las 12 horas, para mantener la veracidad del mapa.
- La ubicación se maneja por zona aproximada en las vistas públicas; la dirección exacta
  del hogar nunca se publica.
- Los datos de contacto son opcionales y, si la persona los sube, se muestran públicamente
  con su consentimiento explícito (aviso previo). La coordinación de la entrega ocurre por
  fuera del portal a través de ese contacto, sin verificación previa de las publicaciones.
- El catálogo de tipos de insumos es acotado y administrable (agua, alimentos, medicinas,
  higiene, abrigo, etc.) y puede ampliarse según evolucione la emergencia.
- El proyecto es de libre uso y código abierto; no se contempla cobro alguno por su uso.
- La moderación y los mecanismos anti-abuso existen para proteger la conexión directa, no
  para intermediarla ni condicionarla con peajes.
