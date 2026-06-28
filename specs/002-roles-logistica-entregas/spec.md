# Feature Specification: Roles, Dashboards y Logística de Entregas

**Feature Branch**: `002-roles-logistica-entregas`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Dashboards para donantes y necesitados; nuevo tipo de usuario
'personal de apoyo' (repartidores y transportistas) con número y foto de cédula; órdenes de
entrega autónomas tipo app de delivery sin control central; flujo donante→transportista→
necesitado; gestión de incidencias (bloqueos, robos, daños, retrasos) documentadas con
fotos/videos; rastreo en vivo del transportista; recursos ampliados incluyendo herramientas
y recursos humanos (médicos, rescatistas, voluntarios). Todo agnóstico y extensible."

## Clarifications

### Session 2026-06-27

- Q: ¿Nivel de verificación del personal de apoyo antes de tomar órdenes? → A: Auto-aprobación
  inmediata + sistema de reputación y controles anti-abuso a posteriori (FR-004).
- Q: ¿Quién accede a la cédula/foto sin control central? → A: Solo auditoría cifrada;
  desbloqueo únicamente ante una disputa/denuncia formal de una entrega (FR-003).
- Q: ¿Cómo se cubren los recursos humanos (médicos/rescatistas/voluntarios)? → A: Flujo
  híbrido: auto-despliegue por defecto, con opción de solicitar transporte (FR-024).
- (Definido por defecto) Confirmación de recogida/entrega mediante códigos de un solo uso del
  donante y del necesitado, con foto de prueba opcional (FR-011).
- Q: ¿Cómo se resuelve el punto de entrega exacto? → A: Se almacena SIEMPRE la ubicación
  exacta (cifrada y privada); el mapa público sigue mostrando solo la zona aproximada y la
  dirección exacta se revela únicamente al transportista asignado (FR-026).
- Q: ¿Límites y retención de medios? → A: Fotos ≤~5 MB y video corto ≤~15 s/~25 MB; evidencias
  retenidas 90 días; foto de cédula cifrada mientras exista el perfil (FR-027).
- Q: ¿Precisión del rastreo en vivo? → A: Ubicación precisa (GPS real) visible solo para las
  partes de esa entrega; se deja de compartir al finalizar (FR-021).
- Q: ¿Base de la reputación? → A: Valoración mutua 1–5 tras cada entrega + suspensión
  automática por reputación baja o reportes acumulados (FR-028).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de personal de apoyo (Priority: P1)

Una persona que quiere ayudar entregando recursos se registra como **personal de apoyo**,
eligiendo un rol (repartidor o transportista). Aporta su número de cédula y una foto de la
misma como respaldo de responsabilidad, sin tener que hablar con nadie ni esperar la
aprobación manual de un operador.

**Why this priority**: Sin personal de apoyo registrado no existe quien lleve los recursos;
es la base del nuevo flujo logístico.

**Independent Test**: Registrarse como transportista aportando cédula y foto, y verificar
que queda habilitado para ver y tomar órdenes de entrega, con sus datos sensibles
protegidos (no públicos).

**Acceptance Scenarios**:

1. **Given** una persona sin cuenta de apoyo, **When** completa el registro con rol, número
   y foto de cédula, **Then** su perfil de personal de apoyo queda creado y habilitado según
   la política de verificación vigente.
2. **Given** un registro sin foto de cédula o sin número, **When** intenta enviarlo,
   **Then** el sistema lo impide e indica qué falta.
3. **Given** un perfil de apoyo creado, **When** alguien consulta vistas públicas,
   **Then** la cédula y su foto nunca se muestran públicamente.

---

### User Story 2 - Donante prepara recursos y se publica una orden de entrega (Priority: P1)

Un donante que se comprometió con una necesidad marca los recursos como **listos para
llevar** e indica el punto de recogida (su zona aproximada). El sistema publica entonces una
**orden de entrega** disponible (recogida en el donante → entrega al necesitado) que el
personal de apoyo puede tomar.

**Why this priority**: Es la precondición del flujo de delivery; convierte una donación
comprometida en trabajo logístico disponible.

**Independent Test**: Desde una donación comprometida, marcar "listo para llevar" y verificar
que aparece una orden de entrega disponible con origen, destino (zona) y lista de recursos.

**Acceptance Scenarios**:

1. **Given** una necesidad con un donante comprometido, **When** el donante marca los
   recursos como listos e indica la zona de recogida, **Then** se crea una orden de entrega
   en estado "disponible".
2. **Given** una orden disponible, **When** se consulta el listado de órdenes, **Then**
   muestra recursos, zona de recogida y zona de entrega (ambas aproximadas), sin direcciones
   exactas hasta que haya emparejamiento con un transportista.

---

### User Story 3 - Tomar una orden y completar la entrega (tipo delivery) (Priority: P1)

El personal de apoyo ve las órdenes disponibles cercanas, **toma** una (de forma exclusiva),
recoge los recursos en el donante, los transporta y los entrega al necesitado, actualizando
el estado en cada paso, sin coordinación central.

**Why this priority**: Es el corazón del sistema autónomo "como app de delivery": mueve los
recursos del donante al necesitado.

**Independent Test**: Con una orden disponible, tomarla, avanzar por los estados
(recogida → en camino → entregada) y verificar que el estado se refleja en tiempo real y que
la orden queda cerrada al confirmar la entrega.

**Acceptance Scenarios**:

1. **Given** una orden disponible, **When** un transportista la toma, **Then** pasa a
   "tomada" de forma exclusiva (un solo responsable a la vez) y deja de estar disponible.
2. **Given** una orden tomada, **When** el transportista confirma la recogida en el donante,
   **Then** la orden pasa a "recogida/en camino" y se habilita la confirmación de entrega.
3. **Given** una orden en camino, **When** el transportista confirma la entrega al
   necesitado, **Then** la orden pasa a "entregada", la necesidad asociada se marca como
   atendida y todo se refleja en tiempo real para donante y necesitado.
4. **Given** una orden tomada que no avanza, **When** transcurre un tiempo razonable sin
   actividad, **Then** la orden puede liberarse y volver a "disponible".

---

### User Story 4 - Dashboard del donante (Priority: P2)

Un donante accede a un panel con todas las necesidades, la **distancia** a la que está de
cada una, los **insumos más solicitados** y métricas útiles (totales, por categoría, por
urgencia), para decidir mejor a quién y con qué ayudar.

**Why this priority**: Mejora la toma de decisiones del donante; aporta valor aunque el flujo
logístico ya funcione.

**Independent Test**: Con necesidades existentes y la ubicación del donante, abrir el panel y
verificar la lista con distancias y el ranking de insumos más solicitados.

**Acceptance Scenarios**:

1. **Given** necesidades existentes y la ubicación aproximada del donante, **When** abre su
   panel, **Then** ve las necesidades ordenables por distancia, con la distancia mostrada.
2. **Given** datos de necesidades, **When** consulta el panel, **Then** ve los insumos más
   solicitados y conteos por categoría y urgencia.

---

### User Story 5 - Dashboard del necesitado (Priority: P2)

Un necesitado accede a un panel donde ve **quién le está enviando ayuda**, qué recursos
vienen en camino y **cuándo deberían llegar** (estado y tiempo estimado de la entrega en
curso).

**Why this priority**: Da tranquilidad y previsibilidad a la persona afectada; reduce
incertidumbre y llamadas/duplicaciones.

**Independent Test**: Con una entrega en curso hacia un necesitado, abrir su panel y verificar
que muestra el estado de la entrega y un tiempo estimado de llegada.

**Acceptance Scenarios**:

1. **Given** una entrega en camino hacia el necesitado, **When** abre su panel, **Then** ve
   el estado actual (tomada/recogida/en camino) y un tiempo estimado de llegada.
2. **Given** varias ayudas dirigidas a la misma persona, **When** abre su panel, **Then** ve
   cada entrega con sus recursos y estado, sin datos personales sensibles del transportista.

---

### User Story 6 - Gestión de incidencias en ruta (Priority: P2)

Durante una entrega, el personal de apoyo puede reportar **incidencias** (bloqueo de vía,
robo, daño a los recursos, retraso, etc.), adjuntando **foto o video** como evidencia. La
incidencia queda registrada y visible para las partes de esa entrega.

**Why this priority**: La operación en zona de desastre encuentra obstáculos reales; sin
registro documentado se pierde trazabilidad y confianza.

**Independent Test**: En una entrega en curso, reportar una incidencia con una foto y
verificar que queda registrada, cambia/anota el estado de la entrega y es visible para
donante y necesitado.

**Acceptance Scenarios**:

1. **Given** una entrega en curso, **When** el transportista reporta una incidencia con
   evidencia (foto/video), **Then** la incidencia queda registrada con su tipo, momento y
   evidencia, y se notifica a las partes.
2. **Given** una incidencia de bloqueo o robo, **When** se registra, **Then** la entrega
   refleja el nuevo estado (p. ej. "con incidencia") y puede requerir reasignación.
3. **Given** un intento de reporte sin evidencia cuando se requiere, **When** se envía,
   **Then** el sistema solicita la foto o video antes de aceptarlo.

---

### User Story 7 - Rastreo en vivo de la entrega (Priority: P3)

Mientras el personal de apoyo tiene la app abierta durante una entrega activa, su **ubicación
se comparte en vivo** con las partes de esa entrega (donante y necesitado), para seguir el
avance y estimar la llegada. Al finalizar la entrega o cerrar la app, deja de compartirse.

**Why this priority**: Mejora la previsibilidad y confianza, pero la entrega funciona aun sin
rastreo continuo (se puede inferir por estados).

**Independent Test**: Con una entrega activa y la app abierta, verificar que la ubicación del
transportista se actualiza en el panel del necesitado, y que deja de compartirse al entregar.

**Acceptance Scenarios**:

1. **Given** una entrega activa con la app abierta, **When** el transportista se desplaza,
   **Then** su ubicación aproximada se actualiza en vivo para donante y necesitado.
2. **Given** una entrega finalizada o la app cerrada, **When** se consulta el rastreo,
   **Then** la ubicación ya no se comparte.

---

### User Story 8 - Recursos ampliados y agnósticos (Priority: P2)

El sistema admite tipos de recurso más allá de insumos médicos, comida y ropa: también
**herramientas** y **recursos humanos** (personal médico, rescatistas, voluntarios). Los
tipos de recurso y los roles son **configurables** para añadir nuevos sin reescribir el
sistema.

**Why this priority**: Amplía el impacto del portal y materializa el requisito de
extensibilidad; varias necesidades reales no son "insumos" físicos.

**Independent Test**: Publicar una necesidad de un recurso humano (p. ej. "rescatista") y de
una herramienta, y verificar que el sistema las clasifica y las enruta por el flujo adecuado.

**Acceptance Scenarios**:

1. **Given** el catálogo de recursos, **When** se añade un nuevo tipo de recurso o un nuevo
   subtipo de personal de apoyo, **Then** queda disponible sin cambios de código.
2. **Given** una necesidad de recurso humano (voluntario/médico/rescatista), **When** alguien
   se ofrece a cubrirla, **Then** el sistema gestiona ese ofrecimiento según el flujo
   definido para recursos humanos.

---

### Edge Cases

- ¿Qué pasa si dos personas de apoyo intentan tomar la misma orden casi simultáneamente?
- ¿Qué ocurre si un transportista toma una orden y abandona sin entregar ni reportar?
- ¿Cómo se evita que se exponga la dirección exacta del donante o del necesitado a personas
  no involucradas en esa entrega?
- ¿Qué sucede si el necesitado no está disponible al llegar el transportista?
- ¿Cómo se maneja un robo total de los recursos en ruta (la necesidad debe reabrirse)?
- ¿Qué pasa con el rastreo si el transportista pierde señal o cierra la app?
- ¿Cómo se previene el abuso de personas que se registran con cédulas falsas o ajenas?
- ¿Qué ocurre con una necesidad de recurso humano que nadie puede "transportar" (la persona
  va por sí misma)?
- ¿Cómo se evita la duplicación cuando varios donantes/transportistas atienden la misma
  necesidad?

## Requirements *(mandatory)*

### Functional Requirements

#### Personal de apoyo y roles

- **FR-001**: El sistema MUST permitir registrarse como personal de apoyo eligiendo un rol
  de un catálogo extensible (inicialmente: repartidor, transportista).
- **FR-002**: El registro de personal de apoyo MUST requerir número de cédula y una foto de
  la cédula como respaldo de responsabilidad.
- **FR-003**: El sistema MUST tratar el número y la foto de cédula como datos sensibles:
  nunca se muestran públicamente y se almacenan **cifrados como respaldo de auditoría**.
  Nadie los consulta de forma rutinaria; solo se desbloquean ante una disputa o denuncia
  formal asociada a una entrega concreta (acceso mínimo y justificado).
- **FR-004**: El sistema MUST permitir que el personal de apoyo opere de inmediato tras
  registrarse (**auto-aprobación**, sin control central), construyendo confianza mediante un
  sistema de **reputación** (entregas exitosas y valoraciones) y controles anti-abuso a
  posteriori (reportes, límites de tasa, suspensión por reputación negativa).
- **FR-005**: Los roles de personal de apoyo MUST ser configurables para añadir nuevos
  subtipos sin reescribir el sistema (agnóstico).

#### Órdenes de entrega (flujo delivery)

- **FR-006**: El sistema MUST permitir a un donante marcar los recursos de una donación
  comprometida como "listos para llevar" e indicar una zona de recogida aproximada.
- **FR-007**: El sistema MUST generar una orden de entrega "disponible" que vincule el punto
  de recogida (donante) con el destino (necesidad), incluyendo la lista de recursos.
- **FR-008**: El personal de apoyo MUST poder ver las órdenes disponibles cercanas y tomar
  una de forma exclusiva (un solo responsable activo por orden).
- **FR-009**: El sistema MUST modelar el ciclo de vida de una orden con estados claros
  (disponible → tomada → recogida/en camino → entregada), más estados de excepción
  (con incidencia, liberada, cancelada).
- **FR-010**: El sistema MUST liberar automáticamente una orden tomada que no avanza tras un
  tiempo razonable, devolviéndola a "disponible".
- **FR-011**: El sistema MUST confirmar de forma fiable la recogida y la entrega mediante
  **códigos de un solo uso**: el donante entrega su código al transportista en la recogida y
  el necesitado entrega el suyo en la entrega; el transportista los introduce para avanzar el
  estado. Opcionalmente se adjunta una foto como prueba de entrega. Esto evita que un tercero
  marque entregas falsas.
- **FR-012**: Al entregarse una orden, el sistema MUST marcar la necesidad asociada como
  atendida y reflejarlo en tiempo real para las partes.
- **FR-013**: Si los recursos se pierden o dañan totalmente en ruta, el sistema MUST permitir
  reabrir la necesidad asociada para que pueda volver a atenderse.

#### Dashboards

- **FR-014**: El sistema MUST ofrecer al donante un panel con todas las necesidades, la
  distancia a cada una desde su ubicación aproximada, y los insumos/recursos más solicitados.
- **FR-015**: El panel del donante MUST mostrar métricas agregadas: totales, conteos por
  categoría de recurso y por nivel de urgencia.
- **FR-016**: El sistema MUST ofrecer al necesitado un panel con las entregas dirigidas a él,
  mostrando quién envía ayuda (sin datos personales sensibles), qué recursos y el estado.
- **FR-017**: El panel del necesitado MUST mostrar un tiempo estimado de llegada de la
  entrega en curso, actualizado con el avance.

#### Incidencias y evidencia

- **FR-018**: El personal de apoyo MUST poder reportar incidencias durante una entrega,
  tipificadas de un catálogo extensible (bloqueo de vía, robo, daño, retraso, otro).
- **FR-019**: El reporte de incidencia MUST permitir adjuntar evidencia (foto o video) y
  MUST requerirla para los tipos que lo ameriten.
- **FR-020**: Las incidencias MUST quedar registradas de forma auditable (tipo, momento,
  evidencia) y visibles para las partes de esa entrega.

#### Rastreo en vivo

- **FR-021**: El sistema MUST compartir la ubicación **precisa (GPS real)** del personal de
  apoyo en vivo con las partes de una entrega **activa** mientras la app esté abierta, para
  una ETA fiable, y MUST dejar de compartirla al finalizar la entrega o cerrar la app. Esta
  ubicación precisa es visible solo para el donante y el necesitado de esa entrega.
- **FR-022**: El rastreo en vivo MUST estar limitado a las partes involucradas en esa entrega
  (donante y necesitado), nunca al público.

#### Recursos ampliados y agnosticismo

- **FR-023**: El catálogo de tipos de recurso MUST ser configurable e incluir, además de
  insumos médicos/comida/ropa, herramientas y recursos humanos (médicos, rescatistas,
  voluntarios), pudiendo añadir más sin reescribir el sistema.
- **FR-024**: El sistema MUST distinguir recursos físicos (se transportan) de recursos
  humanos. Para los recursos humanos aplica un flujo **híbrido**: por defecto la persona
  (médico/rescatista/voluntario) se **auto-despliega** y va directamente al destino (sin
  transportista), pero MAY solicitar que un transportista la lleve si lo necesita. El sistema
  conecta, comparte la zona y muestra estado/llegada en ambos casos.
- **FR-025**: Las nuevas capacidades MUST preservar los principios de la constitución:
  privacidad y minimización de datos, acceso directo sin intermediarios obligatorios,
  mobile-first, tiempo real, y operación abierta/gratuita.

#### Ubicación exacta, medios y reputación

- **FR-026**: El sistema MUST almacenar **siempre la ubicación exacta** de necesidades y
  puntos de recogida/entrega, de forma **cifrada y privada**. La vista pública (mapa) MUST
  seguir mostrando únicamente la zona aproximada ofuscada; la dirección/coordenada exacta solo
  se revela al **transportista asignado** a esa orden (y para auditoría ante disputa), nunca
  al público ni a terceros. Esto preserva el Principio I (la exposición sigue siendo por zona;
  el dato exacto se guarda protegido para habilitar la entrega).
- **FR-027**: El sistema MUST aceptar evidencia en foto (≤ ~5 MB) y video corto (≤ ~15 s /
  ~25 MB), y MUST retener las evidencias de incidencias y pruebas de entrega durante 90 días.
  La foto de cédula MUST almacenarse cifrada y conservarse mientras exista el perfil del
  personal de apoyo, sujeta a FR-003.
- **FR-028**: El sistema MUST permitir que donante y necesitado valoren al personal de apoyo
  (escala 1–5) tras cada entrega, calcular una reputación a partir de esas valoraciones, y
  **suspender automáticamente** a quien caiga por debajo de un umbral de reputación o acumule
  reportes, sin intervención de un operador central.

### Key Entities *(include if feature involves data)*

- **Personal de apoyo**: Persona que ayuda con entregas. Atributos: rol (repartidor/
  transportista, extensible), número de cédula (sensible, cifrado), foto de cédula (sensible,
  cifrada), estado (auto-aprobado/suspendido), reputación (promedio de valoraciones 1–5,
  conteo de entregas, reportes). Vinculado a su identidad ligera.
- **Valoración**: Calificación 1–5 que donante y necesitado dan al personal de apoyo tras una
  entrega; base del cálculo de reputación y de la suspensión automática.
- **Ubicación exacta (privada)**: Coordenada precisa de una necesidad o de un punto de
  recogida/entrega, almacenada cifrada; nunca pública; revelada solo al transportista
  asignado. Distinta de la zona aproximada pública.
- **Rol de apoyo (catálogo)**: Tipos de personal de apoyo, configurable.
- **Recurso / Tipo de recurso (catálogo)**: Clasificación extensible de recursos (insumos
  médicos, comida, ropa, herramientas, recursos humanos…), con atributo de "transportable"
  vs "auto-desplegable".
- **Orden de entrega**: Trabajo logístico que vincula una donación lista (origen/donante) con
  una necesidad (destino/necesitado). Atributos: recursos, zona de recogida y de entrega,
  estado, personal de apoyo asignado, marcas temporales, tiempo estimado de llegada.
- **Incidencia**: Evento durante una entrega (bloqueo, robo, daño, retraso, otro), con
  evidencia (foto/video), momento y autor; ligada a una orden.
- **Evidencia (medio)**: Foto o video adjunto a una incidencia o a una prueba de entrega.
- **Ubicación en vivo**: Posición **precisa** y temporal del personal de apoyo durante una
  entrega activa, visible solo para las partes (donante y necesitado); se descarta al
  finalizar.
- **Métrica de dashboard**: Vistas agregadas derivadas (distancias, rankings, conteos) para
  donantes y necesitados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede registrarse como personal de apoyo (rol + cédula + foto) en
  menos de 3 minutos desde un móvil.
- **SC-002**: El personal de apoyo puede encontrar y tomar una orden de entrega disponible en
  menos de 2 minutos desde que abre el listado.
- **SC-003**: Los cambios de estado de una orden (tomada, recogida, en camino, entregada) se
  reflejan para donante y necesitado en menos de 5 segundos.
- **SC-004**: El panel del donante muestra las necesidades ordenadas por distancia y el
  ranking de recursos más solicitados de forma correcta y en menos de 3 segundos.
- **SC-005**: El panel del necesitado muestra el estado y un tiempo estimado de llegada de
  cada entrega en curso.
- **SC-006**: El 100% de las incidencias reportadas que requieren evidencia quedan registradas
  con su foto o video.
- **SC-007**: Durante una entrega activa con la app abierta, la ubicación del personal de
  apoyo se actualiza al menos cada 30 segundos para las partes, y deja de compartirse al
  finalizar.
- **SC-008**: Ninguna vista pública ni ninguna parte no involucrada accede a la cédula/foto
  del personal de apoyo ni a la ubicación exacta de donantes/necesitados.
- **SC-009**: Añadir un nuevo tipo de recurso o un nuevo rol de apoyo no requiere cambios de
  código (se realiza por configuración).
- **SC-010**: Al menos el 90% de las órdenes tomadas se cierran (entregadas, reabiertas o
  liberadas) en lugar de quedar bloqueadas indefinidamente.

## Assumptions

- El público de personal de apoyo accede desde móviles, con conectividad intermitente.
- La cédula y su foto se recolectan como respaldo de responsabilidad; se almacenan de forma
  protegida y se tratan con minimización de datos (Principio I de la constitución).
- Se almacena siempre la ubicación exacta (cifrada y privada) de necesidades y puntos de
  recogida/entrega; las vistas públicas siguen mostrando solo la zona aproximada, y la
  coordenada exacta solo se revela al transportista asignado a esa orden (y para auditoría
  ante disputa), nunca al público.
- El rastreo en vivo comparte ubicación precisa solo con las partes de la entrega activa.
- Reputación basada en valoraciones mutuas 1–5; suspensión automática por reputación baja.
- El sistema opera de forma autónoma: la coordinación donante↔transportista↔necesitado ocurre
  por el propio flujo de la app, sin un operador central que apruebe cada entrega.
- Los catálogos de roles y de tipos de recurso son administrables/configurables para cumplir
  el requisito de extensibilidad.
- Las evidencias (fotos/videos) se almacenan con límites de tamaño/retención razonables.
- Se mantiene el despliegue en Cloudflare y la gratuidad/apertura del portal.
- Esta feature amplía (no reemplaza) el portal y el mapa en tiempo real existentes (feature 1).
