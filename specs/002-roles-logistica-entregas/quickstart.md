# Quickstart — Feature 2: Roles y Logística de Entregas

**Feature**: 002-roles-logistica-entregas. Extiende el entorno de la feature 1.

## Requisitos nuevos

- **R2** (almacenamiento de medios) y un **secret de cifrado** (`ENCRYPTION_KEY`).
- Bindings adicionales en `backend/wrangler.jsonc`: R2 (`MEDIA`), Durable Object
  `DeliveryRoom`, y la nueva migración D1 `0002`.

## 1. Crear recursos

```bash
cd backend
# Bucket R2 para medios (privado)
wrangler r2 bucket create ayuda-venezuela-media

# Secret de cifrado (clave AES-GCM de 32 bytes en base64)
node -e "console.log(crypto.randomBytes(32).toString('base64'))" | npx wrangler secret put ENCRYPTION_KEY

# Aplicar la nueva migración (añade tablas de logística y la ubicación exacta cifrada a need)
wrangler d1 migrations apply ayuda-venezuela --local      # local
# wrangler d1 migrations apply ayuda-venezuela --remote    # producción
```

`wrangler.jsonc` debe declarar:
```jsonc
"r2_buckets": [{ "binding": "MEDIA", "bucket_name": "ayuda-venezuela-media" }],
"durable_objects": { "bindings": [
  { "name": "MAP_ROOM", "class_name": "MapRoom" },
  { "name": "DELIVERY_ROOM", "class_name": "DeliveryRoom" }
]},
"migrations": [
  { "tag": "v1", "new_sqlite_classes": ["MapRoom"] },
  { "tag": "v2", "new_sqlite_classes": ["DeliveryRoom"] }
]
```

## 2. Configurar catálogos (KV)

```bash
# Semillas de catálogos configurables (extensibles sin redeploy)
wrangler kv key put --binding CONFIG support_roles '[{"code":"repartidor","labelEs":"Repartidor","requiresCedula":true},{"code":"transportista","labelEs":"Transportista","requiresCedula":true}]'
wrangler kv key put --binding CONFIG resource_types '[{"code":"agua","labelEs":"Agua","icon":"💧","kind":"fisico","transportable":true},{"code":"medico","labelEs":"Personal médico","icon":"🩺","kind":"humano","transportable":false}]'
```

## 3. Probar el flujo logístico (local)

1. **Registro de apoyo**: inicia sesión, sube foto de cédula y regístrate como transportista.
2. **Donante prepara**: desde una donación comprometida, marca "listo para llevar" → se crea
   una **orden disponible** (verás el código de recogida).
3. **Tomar orden**: como transportista, abre "Órdenes", toma una; se te revelan las direcciones
   exactas de recogida y entrega.
4. **Recogida**: introduce el código del donante → estado `recogida/en_camino`.
5. **Rastreo en vivo**: con la app abierta, tu ubicación se comparte con donante y necesitado;
   el panel del necesitado muestra ETA.
6. **Entrega**: introduce el código del necesitado (+ foto de prueba) → `entregada`; la
   necesidad se marca atendida.
7. **Incidencia** (opcional): reporta un bloqueo/robo con foto/video.
8. **Valoración**: donante/necesitado te califican (1–5); tu reputación se actualiza.

## 4. Verificación de constitución (checklist rápido)

- [ ] La cédula (número y foto) **nunca** aparece en respuestas públicas; se guarda cifrada.
- [ ] La ubicación exacta se guarda **cifrada**; el mapa público sigue mostrando solo zona.
- [ ] Las direcciones exactas solo se revelan al transportista **asignado**.
- [ ] El rastreo en vivo (preciso) solo lo ven donante y necesitado de esa entrega.
- [ ] Los medios se sirven solo a partes autorizadas; evidencias se purgan a los 90 días.
- [ ] Tomar órdenes y dashboards son usables en móvil y en español (WCAG AA).
- [ ] Añadir un rol o tipo de recurso es solo configuración en KV (sin redeploy).

## 5. Despliegue

```bash
cd backend && wrangler d1 migrations apply ayuda-venezuela --remote && wrangler deploy
cd ../web && npm run build && wrangler pages deploy dist --project-name ayuda-venezuela --branch main
```
