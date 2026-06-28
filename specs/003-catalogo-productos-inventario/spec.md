# Feature Specification: Catálogo de Productos e Inventario Público

**Feature Branch**: `003-catalogo-productos-inventario`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Productos específicos dentro de cada categoría; catálogo común y
abierto con deduplicación; selector con buscador al publicar/donar/enviar; inventario propio
por usuario (donante y necesitado) con libro de movimientos inmutable y público (entregas y
bajas por consumido/roto/extraviado/estropeado); vista agregada de distribución oferta vs
demanda por zona. Integrado con necesidades y órdenes de la feature 2."

## Clarifications

### Session 2026-06-28

- Q: ¿Nivel de deduplicación del catálogo de productos? → A: Normalizada exacta
  (mayúsculas/espacios/acentos); sin fusión automática por typo (FR-004).
- Q: ¿Productos reemplazan o complementan la categoría? → A: Se mantiene la categoría y los
  productos son opcionales dentro de ella (FR-005).
- Q: ¿Identidad pública en el libro de movimientos? → A: Nombre público elegido por el usuario
  (real o seudónimo); por defecto, alias no personal (FR-015).
- (A pedido del usuario) Se añade la **normalización del modelo de datos** existente como
  parte de esta feature (US7, FR-021–FR-024).
- Q: ¿Cómo se refleja la cadena de custodia transportista? → A: Dos pasos: donante→transportista
  al recoger y transportista→necesitado al entregar; el transportista tiene inventario "en
  tránsito" (FR-011, FR-016, FR-025).
- Q: ¿Entregas directas sin orden? → A: Sí, un donante puede registrar manualmente una entrega
  en mano, además de las generadas por órdenes (FR-026).
- Q: ¿Unidad de medida por producto? → A: Sí, cada producto tiene una unidad base, permitiendo
  conversiones entre unidades compatibles del mismo tipo (p. ej. gramos↔kilos) al registrar
  cantidades (FR-027).
- Q: ¿Control anti-abuso del catálogo abierto? → A: Sin control por ahora (confianza total); se
  reconoce como riesgo a revisar más adelante (FR-003).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir productos específicos con buscador (Priority: P1)

Al publicar una necesidad (o al donar/preparar una orden), la persona elige **productos
específicos** dentro de una categoría usando un **selector con buscador** (p. ej. en
"alimentos" busca y agrega "arroz", "harina", "aceite"). La lista de productos es **común** a
toda la app; si el producto ya existe, lo reutiliza en vez de crear un duplicado.

**Why this priority**: Es la base del resto: sin productos específicos no hay inventario ni
distribución por producto. Mejora de inmediato la precisión de necesidades y donaciones.

**Independent Test**: Buscar y agregar un producto existente a una necesidad y verificar que
se reutiliza el mismo producto del catálogo; agregar uno nuevo y verificar que queda
disponible para los demás.

**Acceptance Scenarios**:

1. **Given** el catálogo de productos, **When** la persona escribe en el buscador, **Then**
   ve coincidencias del catálogo común para elegir.
2. **Given** un producto que no existe, **When** la persona lo agrega, **Then** se incorpora
   al catálogo común (tras normalización) y queda disponible para todos.
3. **Given** un producto que ya existe con otra grafía (mayúsculas/espacios/acentos), **When**
   alguien intenta agregarlo, **Then** el sistema lo reconoce como el mismo y no crea un
   duplicado.

---

### User Story 2 - Inventario propio por usuario (Priority: P1)

Cada donante y cada necesitado tiene su **propio inventario** de productos (cantidades por
producto), que puede actualizar en cualquier momento. Las altas y cambios quedan registrados.

**Why this priority**: Es el corazón de la transparencia: saber qué tiene cada quién y qué
recibió. Aporta valor aunque la distribución agregada llegue después.

**Independent Test**: Agregar manualmente una cantidad de un producto al propio inventario y
verificar que el saldo se actualiza y queda un registro del movimiento.

**Acceptance Scenarios**:

1. **Given** el inventario propio, **When** la persona agrega N unidades de un producto,
   **Then** el saldo del producto aumenta en N y se crea un registro de "alta".
2. **Given** un inventario con saldo, **When** se consulta, **Then** muestra el saldo actual
   por producto y el historial de movimientos.

---

### User Story 3 - Libro de movimientos inmutable y público (Priority: P1)

Todos los movimientos de inventario quedan en un **registro permanente e imborrable** (libro
mayor append-only) y son **públicos**: cualquiera puede auditar qué se entregó, en qué
cantidad y qué pasó después. Una entrega registrada entre donante y necesitado aparece como
**salida** en el inventario del donante y como **entrada** en el del necesitado.

**Why this priority**: La transparencia pública es el objetivo central declarado; sin
inmutabilidad y publicidad no se genera la confianza buscada.

**Independent Test**: Registrar una entrega donante→necesitado y verificar que aparece como
salida en uno y entrada en el otro, que es visible públicamente y que no puede borrarse.

**Acceptance Scenarios**:

1. **Given** una entrega de X unidades de un producto de un donante a un necesitado, **When**
   se registra, **Then** crea un movimiento de salida en el donante y de entrada en el
   necesitado, ambos públicos y permanentes.
2. **Given** cualquier movimiento registrado, **When** una persona intenta borrarlo o
   editarlo, **Then** el sistema lo impide (solo se pueden añadir movimientos correctivos).
3. **Given** el libro público, **When** alguien lo consulta, **Then** puede ver los
   movimientos sin necesidad de iniciar sesión.

---

### User Story 4 - Bajas por consumo/daño/pérdida (Priority: P2)

La persona dueña de un inventario puede marcar unidades de un producto como **consumidas,
rotas, extraviadas o estropeadas**. Esto **descuenta** la(s) unidad(es) del saldo pero deja
un **nuevo registro** del cambio con su motivo (no borra el historial).

**Why this priority**: Cierra el ciclo de vida del insumo y mantiene la veracidad del saldo,
sin perder la trazabilidad. Depende del inventario (US2/US3).

**Independent Test**: Sobre un producto con saldo, marcar una unidad como "consumida" y
verificar que el saldo baja en 1 y queda un movimiento de baja con motivo, sin borrar nada.

**Acceptance Scenarios**:

1. **Given** un producto con saldo ≥1, **When** la persona marca 1 unidad como
   consumida/rota/extraviada/estropeada, **Then** el saldo baja en 1 y se crea un movimiento
   de baja con el motivo.
2. **Given** un producto con saldo 0, **When** se intenta una baja, **Then** el sistema lo
   impide (no hay unidades que descontar).
3. **Given** una baja registrada, **When** se consulta el libro público, **Then** la baja y
   su motivo son visibles y permanentes.

---

### User Story 5 - Integración con entregas (feature 2) (Priority: P2)

Cuando una **orden de entrega** se confirma como entregada (feature 2), el sistema registra
automáticamente el **movimiento** correspondiente en los inventarios (salida del donante,
entrada del necesitado), sin doble captura manual.

**Why this priority**: Conecta la logística existente con el inventario, evitando trabajo
duplicado y manteniendo la coherencia entre lo entregado y lo inventariado.

**Independent Test**: Confirmar una entrega en el flujo de órdenes y verificar que aparece el
movimiento en ambos inventarios automáticamente.

**Acceptance Scenarios**:

1. **Given** una orden con productos, **When** se confirma la entrega, **Then** se crean los
   movimientos de salida (donante) y entrada (necesitado) por cada producto y cantidad.

---

### User Story 6 - Vista agregada de distribución (Priority: P2)

Una vista pública muestra cuántos productos hay en general, **cómo están distribuidos** por
zona/región, y **a dónde deberían distribuirse** según la oferta (inventarios disponibles) y
la demanda (necesidades) por zona.

**Why this priority**: Convierte los datos de inventario en acción coordinada; orienta a
donantes y transportistas sobre dónde hace más falta.

**Independent Test**: Con inventarios y necesidades en varias zonas, abrir la vista y
verificar los totales por producto y un ranking de zonas con mayor demanda no cubierta.

**Acceptance Scenarios**:

1. **Given** inventarios y necesidades por zona, **When** se abre la vista, **Then** muestra
   totales por producto y por zona.
2. **Given** zonas con distinta demanda no cubierta, **When** se consulta "a dónde
   distribuir", **Then** se priorizan las zonas con mayor demanda insatisfecha.

---

### User Story 7 - Normalización del modelo de datos (Priority: P2)

El modelo de datos actual (features 1 y 2) tiene inconsistencias: los insumos se referencian
como **texto suelto** (códigos de categoría como cadenas) en lugar de entidades con
integridad, y hay redundancias entre tablas similares. Como parte de esta feature, el modelo
se **normaliza**: categorías y productos pasan a ser **datos de referencia compartidos** con
integridad, las necesidades/órdenes/inventarios apuntan a ellos de forma consistente, y se
eliminan redundancias, **preservando los datos existentes**.

**Why this priority**: Sin un modelo normalizado, el catálogo común de productos y el
inventario no pueden mantener integridad ni evitar duplicados; además reduce el "desorden"
actual y facilita el crecimiento.

**Independent Test**: Verificar que necesidades y órdenes referencian productos/categorías del
catálogo común (no cadenas sueltas), que no hay nomenclatura duplicada, y que los datos
previos siguen presentes tras la migración.

**Acceptance Scenarios**:

1. **Given** el esquema actual con insumos como texto, **When** se aplica la normalización,
   **Then** las referencias pasan a apuntar al catálogo común sin perder datos existentes.
2. **Given** dos representaciones del mismo insumo en datos antiguos, **When** se normaliza,
   **Then** se unifican a un único producto/categoría del catálogo.

---

### Edge Cases

- ¿Qué pasa si dos personas agregan el mismo producto casi a la vez (carrera de duplicados)?
- ¿Cómo se migran datos antiguos con insumos en texto a productos del catálogo sin pérdida?
- ¿Cómo se evita unir por error dos productos distintos con nombres parecidos?
- ¿Qué ocurre si se intenta una baja mayor al saldo disponible?
- ¿Cómo se refleja una entrega cuyo necesitado/donante no llevaba inventario aún?
- ¿Qué se muestra públicamente sin exponer la ubicación exacta ni datos personales sensibles?
- ¿Cómo se maneja una corrección de un movimiento erróneo (sin poder borrar)?
- ¿Qué unidad se usa para productos no contables (p. ej. agua a granel)?

## Requirements *(mandatory)*

### Functional Requirements

#### Catálogo de productos

- **FR-001**: El sistema MUST mantener un **catálogo de productos común** a toda la app,
  donde cada producto pertenece a una categoría de insumo existente.
- **FR-002**: Las personas usuarias MUST poder **buscar** productos del catálogo y
  **agregarlos** a una necesidad, donación u orden mediante un selector con buscador.
- **FR-003**: El catálogo MUST ser **abierto**: cualquier usuario autenticado puede agregar
  un producto nuevo si no existe. Por ahora **sin moderación ni control anti-abuso** (confianza
  total); se reconoce como riesgo a revisar más adelante.
- **FR-004**: El sistema MUST **deduplicar y normalizar** los productos mediante coincidencia
  **normalizada exacta**: colapsa diferencias de mayúsculas/minúsculas, espacios y acentos
  ("Arroz ", "arroz", "ARROZ" → el mismo producto). NO se fusionan automáticamente variantes
  por similitud/typo (evita unir por error productos distintos).
- **FR-005**: Se MUST mantener la selección por **categoría** (como hoy) y, además, permitir
  **opcionalmente** agregar productos específicos dentro de la categoría. Una necesidad o
  donación puede indicar solo la categoría o detallar productos concretos.

#### Inventario por usuario

- **FR-006**: Cada usuario (donante y necesitado) MUST tener su **propio inventario** con
  saldos por producto, actualizable en cualquier momento.
- **FR-007**: El sistema MUST permitir **altas** manuales de unidades de un producto al
  inventario propio, registrando el movimiento.
- **FR-008**: El sistema MUST mostrar, por inventario, el **saldo actual** por producto y el
  **historial** completo de movimientos.

#### Libro de movimientos (inmutable y público)

- **FR-009**: Todos los movimientos de inventario MUST ser **inmutables**: no se pueden
  editar ni borrar; las correcciones se hacen añadiendo nuevos movimientos.
- **FR-010**: Todos los movimientos e inventarios MUST ser **públicos** y consultables sin
  iniciar sesión (auditoría abierta).
- **FR-011**: La cadena de custodia de una entrega vía transportista MUST registrarse en
  **dos pasos**: al **recoger**, salida del donante y entrada al inventario "en tránsito" del
  transportista; al **entregar**, salida del transportista y entrada al necesitado. Cada paso
  por producto y cantidad.
- **FR-012**: La persona dueña de un inventario MUST poder registrar **bajas** marcando
  unidades como **consumida/rota/extraviada/estropeada**, lo que **descuenta** del saldo y
  crea un movimiento de baja con su **motivo** (sin borrar el historial).
- **FR-013**: El sistema MUST impedir bajas mayores al saldo disponible.
- **FR-014**: Solo la persona **dueña** del inventario MUST poder registrar altas/bajas en su
  inventario; cualquiera MUST poder **verlo**.
- **FR-015**: Los registros públicos MUST identificar a las partes de un movimiento mediante
  un **nombre público elegido por cada usuario** (puede ser su nombre real o un seudónimo; la
  persona decide cuánto exponer). Si no elige uno, se usa por defecto un **alias no personal**
  (p. ej. "Donante A23"), protegiendo la identidad salvo decisión explícita en contra. Nunca
  se exponen contacto ni ubicación exacta por esta vía.

#### Integración con entregas (feature 2)

- **FR-016**: La integración con órdenes (feature 2) MUST crear los movimientos
  automáticamente en los dos eventos: al **confirmar la recogida** (donante→transportista) y
  al **confirmar la entrega** (transportista→necesitado), sin captura manual doble.
- **FR-017**: Las órdenes y necesidades MUST poder referirse a **productos** del catálogo
  (además de la categoría), reutilizando el inventario y la nomenclatura común.

#### Custodia, entregas directas y unidades

- **FR-025**: El **personal de apoyo (transportista)** MUST tener un inventario "en tránsito"
  que refleje los productos bajo su custodia entre la recogida y la entrega.
- **FR-026**: El sistema MUST permitir registrar **entregas directas** donante→necesitado (en
  mano, sin orden de transporte), además de las generadas por órdenes; ambas producen los
  movimientos correspondientes.
- **FR-027**: Cada producto MUST tener una **unidad de medida base**; el sistema MUST permitir
  **conversiones entre unidades compatibles del mismo tipo** (p. ej. masa: gramos↔kilos;
  volumen: ml↔litros) al registrar cantidades, almacenando el saldo en la unidad base del
  producto.

#### Distribución agregada

- **FR-018**: El sistema MUST ofrecer una vista pública agregada con **totales por producto**
  y su **distribución por zona/región** (sin exponer ubicación exacta).
- **FR-019**: La vista MUST indicar **a dónde debería distribuirse** priorizando las zonas
  con mayor **demanda no cubierta** (necesidades vs oferta disponible).
- **FR-020**: Las nuevas capacidades MUST preservar la constitución: mobile-first y español,
  tiempo real, operación abierta/gratuita, despliegue en Cloudflare, y protección de los
  datos personales (la transparencia aplica a los movimientos de inventario, no a exponer
  ubicación exacta ni datos sensibles de las personas).

#### Normalización del modelo de datos

- **FR-021**: Las **categorías** y los **productos** MUST existir como datos de referencia
  compartidos con integridad (no como cadenas de texto sueltas), de modo que toda la app use
  la misma nomenclatura.
- **FR-022**: Las referencias a insumos en **necesidades, órdenes e inventarios** MUST apuntar
  a productos/categorías del catálogo común, garantizando integridad referencial y evitando
  duplicación de nomenclatura.
- **FR-023**: La normalización MUST **preservar los datos existentes** (migración sin
  pérdida), unificando representaciones equivalentes de un mismo insumo.
- **FR-024**: El modelo MUST seguir **convenciones consistentes** (nomenclatura, tipos, marcas
  temporales) y **eliminar redundancias** entre estructuras equivalentes, reduciendo el
  desorden actual.

### Key Entities *(include if feature involves data)*

- **Categoría**: Tipo de insumo (agua, alimentos, medicinas, herramientas, recursos humanos,
  etc.) como dato de referencia compartido con integridad (deja de ser una cadena suelta).
- **Producto**: Ítem específico del catálogo común (p. ej. "arroz"), perteneciente a una
  categoría. Atributos: nombre canónico, nombre normalizado (para deduplicación), categoría,
  **unidad de medida base** y **dimensión** (masa, volumen o conteo) para habilitar
  conversiones entre unidades compatibles.
- **Catálogo de productos**: Conjunto común y abierto de productos, sin duplicados.
- **Inventario**: Conjunto de saldos por producto, asociado a un usuario. El dueño puede ser
  un **donante**, un **necesitado** o un **transportista** (inventario "en tránsito"). Saldos
  en la unidad base del producto.
- **Movimiento de inventario**: Registro inmutable de un cambio. Atributos: inventario, tipo
  (alta manual, salida/entrada por recogida donante→transportista, salida/entrada por entrega
  transportista→necesitado, entrega directa donante→necesitado, baja por
  consumo/daño/pérdida), producto, cantidad (en unidad base), unidad declarada y factor de
  conversión, motivo (para bajas), contraparte, marca temporal. Append-only y público.
- **Saldo por producto**: Cantidad actual de un producto en un inventario (derivable del
  libro de movimientos).
- **Zona/Distribución**: Agregación de oferta (inventarios) y demanda (necesidades) por
  zona/región, para la vista de distribución.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una persona puede encontrar y agregar un producto del catálogo en menos de 15
  segundos usando el buscador.
- **SC-002**: Agregar un producto con grafía distinta de uno existente (mayúsculas, espacios
  o acentos) no crea un duplicado en el catálogo.
- **SC-003**: El 100% de los movimientos registrados son permanentes: ninguna operación de
  usuario puede borrarlos o editarlos.
- **SC-004**: Cualquier persona puede consultar el inventario y el libro de movimientos de
  forma pública (sin iniciar sesión).
- **SC-005**: Al confirmar una entrega, los movimientos aparecen en ambos inventarios en
  menos de 5 segundos.
- **SC-006**: Una baja por consumo/daño/pérdida descuenta exactamente las unidades indicadas
  y deja un registro con motivo en el 100% de los casos.
- **SC-007**: La vista de distribución refleja correctamente los totales por producto y
  prioriza las zonas con mayor demanda no cubierta.
- **SC-008**: Ninguna vista pública expone la ubicación exacta ni datos personales sensibles
  de las personas, incluso mostrando los movimientos de inventario.

## Assumptions

- Cada producto tiene una **unidad de medida base** y una dimensión (masa/volumen/conteo); al
  registrar cantidades se puede usar cualquier unidad compatible (p. ej. dar 1 kg de un
  producto medido en gramos) y el sistema **convierte** al guardar el saldo en la unidad base.
- El catálogo abierto **no tiene moderación por ahora** (confianza total); es un riesgo
  conocido a mitigar más adelante (límites/reportes) si aparece abuso.
- El inventario se alimenta tanto de **altas manuales** del usuario como de **entregas**
  confirmadas (feature 2).
- La identidad ligera existente (feature 1) identifica al dueño de cada inventario.
- La transparencia pública aplica a productos, inventarios y movimientos; los datos
  personales y la ubicación exacta siguen protegidos por la constitución.
- El catálogo de productos crece con el uso; la deduplicación mantiene su calidad.
- Esta feature amplía (no reemplaza) las necesidades, donaciones y órdenes existentes.
- La normalización del modelo de datos se hace mediante una migración que preserva los datos
  existentes (features 1 y 2) y unifica los insumos en texto hacia el catálogo de productos.
- Las categorías actuales (hoy en configuración) y los insumos en texto se consolidan como
  datos de referencia con integridad como parte de la normalización.
