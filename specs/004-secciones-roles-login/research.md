# Phase 0 Research: Secciones, Roles y Login Único

**Fecha**: 2026-06-28 | **Feature**: 004-secciones-roles-login

## D1. Shell de navegación de 4 secciones

- **Decision**: Reescribir `App.tsx` como un shell con cuatro secciones (Mapa, Centros de
  acopio, Necesitados, Voluntarios) mediante el router por hash existente. Cada sección es un
  componente contenedor que **reutiliza** las páginas ya implementadas (MapPage, PublishPage,
  DonatePage, DeliverPage, InventoryPage, DistributionPage, PublicLedgerPage). El Mapa es la
  vista por defecto.
- **Rationale**: Cumple FR-004/006 sin reescribir funcionalidad; solo reorganiza el árbol de
  navegación. Bajo riesgo, máxima reutilización.
- **Alternatives considered**: Router con librería (react-router): innecesario para el
  presupuesto 3G; el router por hash propio basta y ya está en uso.

## D2. Login único global

- **Decision**: Un componente `LoginButton` en la cabecera que muestra "Iniciar sesión"
  (abre el `IdentityGate` en un panel/modal) o la identidad + "Cerrar sesión". Se elimina el
  gate disperso por acción; las acciones que requieren sesión muestran un aviso que invita a
  usar el botón global. Reutiliza el contexto de sesión (`useSession`) ya existente.
- **Rationale**: Cumple FR-001/002/003 centralizando el acceso; la verificación OTP
  (correo/WhatsApp) ya existe.
- **Alternatives considered**: Mantener gates por acción: lo que el usuario quiere evitar.

## D3. Selector de rol del voluntario (multi-rol)

- **Decision**: `RoleSwitcher` lista los roles de apoyo del usuario (consultados a
  `support_person`) y permite cambiar entre ellos; cada rol renderiza su interfaz
  (repartidor/transportista). Las interfaces se resuelven por un **mapa de rol→componente**
  extensible; añadir un nuevo rol es registrar su componente y el rol en el catálogo KV.
- **Rationale**: Cumple FR-008/009/011 (interfaz por rol, extensible, selector multi-rol).
- **Alternatives considered**: Un solo rol principal / interfaces combinadas: rechazados por el
  usuario a favor del selector.

## D4. Entidad centro de acopio

- **Decision**: Tabla D1 `collection_center` (dueño = identidad, nombre, **lat/lng exactas**,
  region_code, status). Registro **abierto** a usuarios autenticados con **anti-abuso**
  (límite de tasa al crear + reportes que pueden ocultar). Donar como individuo sigue igual;
  donar desde un centro usa la ubicación del centro como punto de recogida.
- **Rationale**: Cumple FR-012/012b/012c/012d. La ubicación es **exacta** porque el centro es
  un punto público (a diferencia de los hogares de necesitados, que siguen ofuscados): no
  contradice el Principio I.
- **Alternatives considered**: Centro obligatorio para donar (rechazado: rompe el flujo
  individual); ubicación ofuscada (rechazado: un punto de acopio debe poder encontrarse).

## D5. Centros en el mapa

- **Decision**: El `MapEngine` añade una **capa de centros** (marcadores distintos de las
  necesidades) con la ubicación exacta y el nombre del centro. Se obtienen por bounding box
  como las necesidades. En tiempo real reutiliza el patrón de difusión existente (o recarga
  como fallback).
- **Rationale**: Cumple FR-012b; reutiliza la abstracción de mapa ya existente.
- **Alternatives considered**: Mapa separado para centros: peor UX; mejor una capa en el mapa
  principal.

## D6. Vistas públicas dentro del Mapa

- **Decision**: La sección Mapa incluye sub-vistas/pestañas para **Distribución** y
  **Transparencia** (libro público), además del mapa. Mantiene las 4 secciones principales
  limpias (FR-007).
- **Rationale**: Decisión del usuario; agrupa lo público/auditoría bajo el Mapa.

## D7. Preservación de rutas previas

- **Decision**: Las rutas de hash anteriores (`#/publish`, `#/donate`, `#/deliver`,
  `#/inventory`, `#/distribution`, `#/ledger`, `#/mine`) **redirigen** a su nueva ubicación
  dentro de las secciones, para no romper enlaces guardados (FR-016).
- **Rationale**: Evita romper marcadores/compartidos.

## Resumen de decisiones

| # | Tema | Decisión |
|---|------|----------|
| D1 | Navegación | Shell de 4 secciones reutilizando páginas existentes |
| D2 | Login | Control único global en cabecera (IdentityGate centralizado) |
| D3 | Roles | RoleSwitcher con mapa rol→componente extensible |
| D4 | Centro de acopio | `collection_center`: opcional, ubicación exacta, abierto + anti-abuso |
| D5 | Mapa | Capa de centros (marcadores) en el mapa principal |
| D6 | Públicas | Distribución y Transparencia como sub-vistas del Mapa |
| D7 | Rutas | Redirección de rutas previas (no romper enlaces) |

**Estado**: Incógnitas resueltas. Listo para Fase 1.
