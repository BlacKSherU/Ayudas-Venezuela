# Feature Specification: Secciones, Roles y Login Único

**Feature Branch**: `004-secciones-roles-login`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Reorganizar la app en 4 secciones (Mapa, Centros de acopio,
Necesitados, Voluntarios) con un login único global e interfaces por rol adaptativo en la
sección Voluntarios (repartidor/transportista, extensible). Secciones abiertas; un usuario
puede usar varias. Reubicar lo existente (features 1–3) sin perder nada."

## Clarifications

### Session 2026-06-28

- Q: ¿"Centro de acopio" es renombre o entidad? → A: **Entidad registrada** con nombre y
  ubicación que puede aparecer en el mapa (puntos para llevar/recoger donaciones) (FR-012).
- Q: ¿Voluntario con múltiples roles? → A: **Selector** para cambiar entre sus roles dentro de
  la sección, cada uno con su interfaz (FR-011).
- Q: ¿Dónde viven Distribución y Transparencia? → A: como **sub-vistas dentro del Mapa** (vista
  pública general), manteniendo limpias las 4 secciones (FR-007).
- Q: ¿Precisión de la ubicación del centro de acopio en el mapa? → A: **Exacta** (es un punto
  público al que la gente acude; a diferencia de los hogares de necesitados) (FR-012b).
- Q: ¿Hace falta un centro para donar? → A: No, **opcional**: se puede donar como individuo
  (flujo actual); registrar un centro es opcional y añade visibilidad en el mapa (FR-012c).
- Q: ¿Control del registro de centros? → A: **Abierto** a cualquier usuario autenticado, con
  controles **anti-abuso a posteriori** (límites de tasa, reportes) (FR-012d).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Login único global (Priority: P1)

En vez de pedir verificación de identidad dispersa en cada acción, hay un **único botón de
"Iniciar sesión"** en la cabecera. La persona verifica su identidad ligera (código por correo
o WhatsApp) una sola vez; la sesión persiste y hay un botón claro para cerrar sesión. Las
acciones que requieren identidad usan esa sesión global.

**Why this priority**: Simplifica el acceso y es la base para que las secciones y los roles
funcionen con una sola identidad.

**Independent Test**: Tocar "Iniciar sesión", verificar el código una vez, y comprobar que la
sesión queda activa en toda la app y que se puede cerrar sesión.

**Acceptance Scenarios**:

1. **Given** una persona sin sesión, **When** toca "Iniciar sesión" y verifica el código,
   **Then** queda autenticada en toda la app sin volver a verificar por cada acción.
2. **Given** una sesión activa, **When** la persona cierra sesión, **Then** vuelve al estado
   no autenticado y la cabecera muestra de nuevo "Iniciar sesión".
3. **Given** una persona no autenticada, **When** intenta una acción que requiere identidad,
   **Then** se le invita a iniciar sesión con el botón global (no un gate distinto por acción).

---

### User Story 2 - Cuatro secciones de navegación (Priority: P1)

La app se organiza en **cuatro secciones** principales: **Mapa**, **Centros de acopio**,
**Necesitados** y **Voluntarios**. La navegación es **abierta**: cualquiera puede entrar a
cualquier sección. Toda la funcionalidad ya existente (necesidades, donaciones, órdenes,
inventario, distribución, transparencia) queda reubicada de forma coherente dentro de estas
secciones, sin perder nada.

**Why this priority**: Es el corazón de la reorganización; da claridad de navegación.

**Independent Test**: Navegar entre las 4 secciones y verificar que cada una agrupa su
funcionalidad correspondiente y que nada de lo anterior se perdió.

**Acceptance Scenarios**:

1. **Given** la app, **When** se carga, **Then** se ven las 4 secciones como navegación
   principal, con el Mapa como vista por defecto.
2. **Given** cualquier sección, **When** una persona sin sesión la abre, **Then** puede verla;
   las acciones que requieren identidad la invitan a iniciar sesión.
3. **Given** la funcionalidad previa, **When** se busca (publicar necesidad, donar, llevar,
   inventario, distribución, transparencia), **Then** está accesible dentro de la sección que
   le corresponde.

---

### User Story 3 - Sección Voluntarios con interfaz por rol (Priority: P1)

La sección **Voluntarios** agrupa a los voluntarios (hoy: **repartidores** y **transportistas**)
y muestra una **interfaz según el rol** registrado: un repartidor ve la interfaz de repartidor
y un transportista la de transportista. El diseño permite **añadir nuevos tipos de voluntario**
en el futuro sin reescribir. Quien aún no es voluntario puede registrarse desde aquí.

**Why this priority**: Materializa el modelo de roles adaptativos que pidió el usuario.

**Independent Test**: Entrar a Voluntarios como repartidor (ver su interfaz), como
transportista (ver la suya), y como persona no registrada (ver la opción de registrarse).

**Acceptance Scenarios**:

1. **Given** un voluntario registrado como transportista, **When** abre la sección Voluntarios,
   **Then** ve la interfaz de transportista (tomar órdenes, etc.).
2. **Given** un voluntario registrado como repartidor, **When** abre la sección, **Then** ve la
   interfaz de repartidor.
3. **Given** una persona no registrada como voluntario, **When** abre la sección, **Then** se le
   ofrece registrarse y elegir su tipo de voluntario.
4. **Given** un nuevo tipo de voluntario configurado, **When** se añade, **Then** la sección lo
   admite sin cambios estructurales.

---

### User Story 4 - Sección Centros de acopio (Priority: P2)

La sección **Centros de acopio** reenmarca la actual experiencia de **donantes**: preparar y
ofrecer donaciones, publicar órdenes de entrega o entregas directas, y gestionar su inventario.

**Why this priority**: Da hogar claro a la funcionalidad de donantes con un nombre acorde al
flujo real (acopio y despacho de insumos).

**Independent Test**: Desde Centros de acopio, preparar una donación/orden y ver el inventario
del centro, reutilizando lo ya implementado.

**Acceptance Scenarios**:

1. **Given** una persona autenticada, **When** abre Centros de acopio, **Then** puede donar a
   una necesidad, publicar orden o entrega directa y ver su inventario.

---

### User Story 5 - Sección Necesitados (Priority: P2)

La sección **Necesitados** agrupa lo de las personas/familias necesitadas: publicar una
necesidad, gestionar sus publicaciones y ver su inventario.

**Why this priority**: Da hogar claro a la funcionalidad de necesitados.

**Independent Test**: Desde Necesitados, publicar una necesidad y ver sus publicaciones e
inventario.

**Acceptance Scenarios**:

1. **Given** una persona autenticada, **When** abre Necesitados, **Then** puede publicar una
   necesidad y ver sus publicaciones e inventario.

---

### User Story 6 - Multi-rol por usuario (Priority: P2)

Una misma persona puede usar varias secciones (p. ej. ser a la vez necesitada y voluntaria) con
una única sesión, sin conflictos ni tener que crear cuentas separadas.

**Why this priority**: Refleja la realidad (las personas tienen múltiples roles) y evita
fricción.

**Independent Test**: Con una sola sesión, publicar una necesidad y también registrarse como
voluntario, y usar ambas secciones sin perder estado.

**Acceptance Scenarios**:

1. **Given** una sesión, **When** la persona actúa como necesitada y luego como voluntaria,
   **Then** ambas funciones operan bajo la misma identidad.

---

### Edge Cases

- ¿Qué ve una persona no autenticada en cada sección (contenido público vs acciones)?
- ¿Qué pasa si un voluntario está registrado con **más de un** tipo de rol?
- ¿Cómo se mantiene la sesión al navegar entre secciones (sin re-login)?
- ¿Dónde quedan las vistas transversales (Distribución y Transparencia pública)?
- ¿Qué pasa con los enlaces/rutas previas tras la reorganización (no romper marcadores)?
- ¿Cómo se comunica que una sección requiere identidad para ciertas acciones?

## Requirements *(mandatory)*

### Functional Requirements

#### Login único

- **FR-001**: La cabecera MUST mostrar un **único control de sesión**: "Iniciar sesión" cuando
  no hay sesión, y la identidad/"Cerrar sesión" cuando la hay.
- **FR-002**: La verificación de identidad ligera (OTP por correo o WhatsApp) MUST realizarse
  desde ese punto único; tras verificar, la sesión MUST persistir en toda la app.
- **FR-003**: Las acciones que requieren identidad MUST usar la sesión global e invitar a
  iniciar sesión con el botón único cuando no exista (sin gates separados por acción).

#### Cuatro secciones

- **FR-004**: La navegación principal MUST constar de cuatro secciones: **Mapa**, **Centros de
  acopio**, **Necesitados**, **Voluntarios**, con el Mapa como vista por defecto.
- **FR-005**: Las secciones MUST ser de **acceso abierto** (cualquiera puede verlas); las
  acciones internas que requieran identidad piden iniciar sesión.
- **FR-006**: Toda la funcionalidad de las features 1–3 (necesidades, donaciones, órdenes,
  inventario, distribución, transparencia) MUST quedar accesible dentro de estas secciones,
  **sin pérdida** de funciones.
- **FR-007**: Las vistas transversales públicas (distribución y libro de transparencia) MUST
  ubicarse como **sub-vistas accesibles desde la sección Mapa** (vista pública general),
  manteniendo las 4 secciones principales limpias.

#### Voluntarios y roles adaptativos

- **FR-008**: La sección **Voluntarios** MUST mostrar la interfaz correspondiente al **rol del
  voluntario** registrado (repartidor → interfaz de repartidor; transportista → interfaz de
  transportista).
- **FR-009**: El conjunto de tipos de voluntario MUST ser **extensible** (configurable), de modo
  que se puedan añadir nuevas interfaces de voluntario sin reescribir la estructura.
- **FR-010**: Una persona no registrada como voluntario MUST poder **registrarse** desde la
  sección y elegir su tipo.
- **FR-011**: Cuando un voluntario tiene **más de un rol**, el sistema MUST ofrecer un
  **selector** para cambiar entre sus roles dentro de la sección, mostrando la interfaz del rol
  seleccionado.

#### Centros de acopio y necesitados

- **FR-012**: La sección **Centros de acopio** MUST agrupar la experiencia de donantes: preparar
  donaciones, publicar órdenes/entregas directas y gestionar su inventario. Un **centro de
  acopio** es una **entidad registrada** con nombre y ubicación (zona) que MAY aparecer en el
  mapa como punto donde llevar o recoger donaciones. Una persona autenticada puede registrar uno
  o más centros y operar a su nombre.
- **FR-012b**: Los centros de acopio registrados MUST mostrarse en el **mapa** con su
  ubicación **exacta** (son puntos públicos a los que la gente acude; a diferencia de los
  hogares de necesitados, que siguen ofuscados).
- **FR-012c**: Donar/preparar una donación NO MUST requerir un centro: una persona puede donar
  como individuo (flujo actual). Registrar un centro es **opcional** y añade visibilidad en el
  mapa; cuando se dona desde un centro, el punto de recogida es la ubicación del centro.
- **FR-012d**: Registrar un centro de acopio MUST estar **abierto** a cualquier usuario
  autenticado, con controles **anti-abuso a posteriori** (límites de tasa al crear y reportes
  comunitarios que pueden ocultar un centro marcado).
- **FR-013**: La sección **Necesitados** MUST agrupar: publicar necesidad, gestionar las
  publicaciones propias y ver el inventario propio.

#### Multi-rol y preservación

- **FR-014**: Una misma identidad MUST poder operar en varias secciones (necesitado, centro de
  acopio, voluntario) sin crear cuentas separadas ni perder estado al navegar.
- **FR-015**: La reorganización MUST preservar la constitución (mobile-first, español, WCAG 2.1
  AA, tiempo real, abierto/gratuito, Cloudflare) y la protección de datos personales (la
  identidad ligera sigue protegida; el rol determina la interfaz, no expone datos sensibles).
- **FR-016**: La reorganización NO MUST romper la funcionalidad previa ni perder datos; las
  rutas anteriores SHOULD redirigir o seguir funcionando para no romper enlaces guardados.

### Key Entities *(include if feature involves data)*

- **Sección**: Una de las cuatro áreas de navegación (Mapa, Centros de acopio, Necesitados,
  Voluntarios). Concepto de navegación, no necesariamente persistido.
- **Rol de voluntario**: Tipo de voluntario (repartidor, transportista, … extensible) que
  determina la interfaz mostrada en la sección Voluntarios. Reutiliza el catálogo de roles de
  apoyo existente.
- **Centro de acopio**: Entidad registrada (opcional) por una identidad, con nombre, **ubicación
  exacta pública** (punto en el mapa), estado (activo/oculto por reportes) y su inventario;
  punto donde llevar/recoger donaciones. Una identidad puede tener uno o más centros. Registro
  abierto con anti-abuso.
- **Identidad / sesión**: La identidad ligera existente (correo/WhatsApp por OTP) con su sesión
  global; puede tener cero o más roles de voluntario, cero o más centros de acopio, y operar en
  varias secciones.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona inicia sesión una sola vez y puede realizar acciones en cualquier
  sección sin volver a verificar su identidad durante la sesión.
- **SC-002**: La navegación principal presenta exactamente las 4 secciones, con el Mapa por
  defecto, y es usable en móvil sin desplazamiento horizontal.
- **SC-003**: Un voluntario ve la interfaz correcta de su rol en menos de 2 segundos al abrir la
  sección Voluntarios.
- **SC-004**: El 100% de las funciones de las features 1–3 siguen accesibles tras la
  reorganización (ninguna se pierde).
- **SC-005**: Una misma persona puede actuar como necesitada y como voluntaria en la misma
  sesión sin conflictos.
- **SC-006**: Añadir un nuevo tipo de voluntario no requiere cambios estructurales en la
  navegación (solo configuración + su interfaz).
- **SC-007**: Ninguna sección expone datos personales sensibles ni la ubicación exacta de las
  personas.

## Assumptions

- Se reutiliza la identidad ligera y el catálogo de roles de apoyo existentes (features 1–2).
- "Centros de acopio" reenmarca a los donantes y añade una entidad opcional de centro con
  ubicación exacta pública en el mapa; donar como individuo sigue funcionando sin centro.
- Las acciones que requieren identidad siguen exigiéndola; lo que cambia es **dónde** se inicia
  sesión (punto único) y **cómo** se navega (4 secciones).
- La sección Voluntarios se apoya en el registro de personal de apoyo ya existente.
- No se eliminan funciones; solo se reubican y se unifica el acceso.
