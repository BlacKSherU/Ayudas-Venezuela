# Quickstart — Feature 4: Secciones, Roles y Login Único

**Feature**: 004-secciones-roles-login. Reorganiza el frontend y añade centros de acopio.

## 1. Migración (centros de acopio)

```bash
cd backend
wrangler d1 migrations apply ayuda-venezuela --local      # local
# wrangler d1 migrations apply ayuda-venezuela --remote    # producción
```

Crea `collection_center`. No toca el resto del esquema (preserva features 1–3).

## 2. Probar (local)

1. **Login único**: en la cabecera, "Iniciar sesión" → verifica (correo o WhatsApp) una vez →
   la sesión queda activa en toda la app; "Cerrar sesión" disponible.
2. **4 secciones**: navega Mapa, Centros de acopio, Necesitados, Voluntarios. El Mapa es la
   vista por defecto y dentro tiene sub-vistas de Distribución y Transparencia.
3. **Voluntarios**: como repartidor ves la interfaz de repartidor; como transportista, la suya;
   si tienes ambos, un **selector** cambia entre ellos; si no eres voluntario, te ofrece
   registrarte.
4. **Centro de acopio**: en Centros de acopio, registra un centro (nombre + punto exacto en el
   mapa) → aparece como marcador en el Mapa. Donar sin centro sigue funcionando.
5. **Rutas previas**: abre `#/donate`, `#/inventory`, etc. → redirigen a su nueva sección.

## 3. Pruebas

```bash
cd backend && npm test     # centros: crear (anti-abuso), listar por bbox, ocultar por reportes
cd ../web && npm run test:e2e   # login único, 4 secciones, selector de rol, centro en mapa (móvil)
```

## 4. Verificación de constitución (checklist rápido)

- [ ] Una sola verificación de identidad por sesión (login único).
- [ ] Las 4 secciones son navegables en móvil sin scroll horizontal; Mapa por defecto.
- [ ] El voluntario ve la interfaz de su rol; con varios, hay selector.
- [ ] El centro de acopio aparece con ubicación **exacta** (punto público); los hogares de
      necesitados siguen **ofuscados**.
- [ ] Donar como individuo sigue funcionando sin centro.
- [ ] Ninguna función de features 1–3 se perdió; rutas previas redirigen.

## 5. Despliegue

```bash
cd backend && wrangler d1 migrations apply ayuda-venezuela --remote && wrangler deploy
cd ../web && npm run build && wrangler pages deploy dist --project-name ayuda-venezuela --branch main
```
