# Plan de corrección — auditoría completa del sistema

## Estado: ✅ COMPLETADO Y VERIFICADO EN NAVEGADOR (Fases 0 a 5 — 26 hallazgos + los 2 puntos que habían quedado pendientes)

Todo lo planeado fue implementado, verificado por código (backend carga sin errores, `npm run build` del frontend limpio en cada fase, cambios de esquema probados contra la base real) y además probado en vivo en el navegador contra la base de datos real, logueado como SuperAdmin. Detalle de cada punto abajo, con lo que se hizo y cualquier ajuste respecto al plan original.

**No queda nada pendiente de esta ronda.** El smoke test manual (ver última sección) se ejecutó completo y todos los flujos pasaron sin errores de consola ni comportamiento inesperado.

## Contexto

Se pidió una revisión completa del sistema (backend + frontend) para detectar bugs e incongruencias antes de seguir agregando funcionalidad. Se lanzaron 5 revisiones en paralelo (auth/roles, ventas/caja, inventario/catálogos, reportes/dashboard/config, infraestructura transversal) que arrojaron 26 hallazgos verificados con archivo:línea concreto. El usuario decidió: (1) ejecutar todo en un solo plan por fases (Crítico → Alto → Medio → Bajo), (2) que la verificación de RUC en Factura se re-valide contra SUNAT en el backend antes de aceptar la venta, y (3) dejar fuera de este plan el correlativo real de boleta/factura por serie (queda documentado como pendiente futuro, no se tocó).

---

## Fase 0 — Crítico ✅

**0.1 — Doble conteo de apertura en `calcularEsperados`** ✅
`server/services/caja.service.js`: el acumulador ahora arranca en `0` (ya no en `montoApertura`) — el propio parámetro `montoApertura` dejó de ser necesario y se quitó de la firma de la función (y de sus dos call sites en `caja.controller.js` y `venta.controller.js`). Además se extrajo la lógica a un helper compartido nuevo, `client/src/utils/caja.js` (`calcularMontosCaja`), usado tanto por `CajaPage.jsx` como por `VentasPage.jsx` — ya no hay una tercera copia divergente del cálculo.

**0.2 — Ajustes de inventario (conteo físico) restaurado** ✅
Tab completo reintegrado en `client/src/modules/inventario/InventarioPage.jsx` (botón, formulario de conteo con sobrante/faltante, historial con filtros), recuperado de `git show edf07d0^` y adaptado a las convenciones actuales del archivo. De paso, el formulario ahora sí pide fecha de vencimiento cuando hay sobrante y el producto maneja vencimiento (ver 1.7).

---

## Fase 1 — Alto ✅

**1.1 — Patrón "comparación cruda de rol" corregido en los 6 archivos** ✅ — todos ahora usan `rolSatisface(...)` de `client/src/utils/roles.js`: `SolicitudesPage.jsx` (crear/aprobar-rechazar/completar), `CategoriasPage.jsx`, `ProveedoresPage.jsx`, `ProductosPage.jsx`, `HistorialVentasPage.jsx` (más `HistorialCajaPage.jsx`, corregido en una sesión anterior).

**1.2 — Enumeración de usuarios en `forgotPassword`** ✅ — ahora responde siempre `200` con el mismo mensaje genérico (`MSG_FORGOT_PASSWORD`), exista o no la cuenta.

**1.3 — Límite de intentos en reset de contraseña** ✅ — reutiliza `intentos_fallidos`/`bloqueo_hasta` de `Usuario`, mismo umbral (`INTENTOS_MAX`) que `login()`.

**1.4 — Anulación de venta protegida contra concurrencia** ✅ — `venta.controller.js:anular` relee y bloquea la `Venta` (`lock: t.LOCK.UPDATE`) dentro de la transacción antes de revertir; `inventario.service.js:revertirConsumo` ahora bloquea también la consulta de `ConsumoLote`.

**1.5 — "Error de registro" restaurado como motivo de baja** ✅ — agregado a `MOTIVOS_BAJA` en `inventario.controller.js` y `InventarioPage.jsx`.

**1.6 — `costo_unitario` ahora se captura** ✅ — `completarSolicitud` (backend) valida y pasa `costo_unitario` a `crearLote`; se agregó el input "Costo unitario (S/)" en el formulario de Entradas (`InventarioPage.jsx`) y en `ModalCompletar` (`SolicitudesPage.jsx`). Confirmado que Ajustes positivos deliberadamente no lo piden (sin costo de compra conocido).

**1.7 — Ajuste positivo exige fecha de vencimiento** ✅ — `registrarAjuste` valida `fecha_vencimiento` con `validarFechaVencimiento()` cuando hay sobrante y el producto maneja vencimiento; el input correspondiente se agregó al restaurar el tab (0.2).

**1.8 — Dashboard ya no queda en error permanente** ✅ — `setError('')` al inicio de `fetchData()`.

**1.9 — "Ventas por día" agrupa en hora Perú** ✅ — `ventasPorDia` usa `("createdAt" AT TIME ZONE 'America/Lima')::date` (columna confirmada como `timestamptz` en Postgres). Verificado con una query real contra la base.

**1.10 — ClientesPage oculta "Editar" para no-Administrador** ✅ — gate con `rolSatisface(usuario?.rol, ['Administrador'])`.

---

## Fase 2 — Medio ✅

**2.1 — Verificación SUNAT server-side para Factura** ✅ — se creó `server/services/consulta.service.js` con `consultarRucSunat(ruc)` y, de paso, `consultarDniReniec(dni)` (mismo refactor, mismo `BASE_URL`/`headers`/chequeo de token — no estaba en el plan original pero era la extracción natural). `consulta.controller.js` quedó como wrapper delgado sobre el servicio. `venta.controller.js:registrar()` llama a `consultarRucSunat` para toda venta con `tipo_comprobante === 'Factura'` y valida `estado === 'ACTIVO'` / `condicion === 'HABIDO'`.

**2.2 — Producto: duplicados por mayúsculas/espacios** ✅ — `trim()` + `Op.iLike` en `crear`/`actualizar` (`producto.controller.js`), más pre-chequeo local en `ProductosPage.jsx` (se le pasó la lista `productos` al modal, mismo patrón que Categorías/Proveedores).

**2.3 — Race condition en `crearSolicitud`** ✅ — envuelto en `sequelize.transaction()`, usando el `Producto` como mutex (`lock: t.LOCK.UPDATE`) antes de chequear/crear.

**2.4 — Cliente.buscarOCrear avisa si el nombre no coincide** ✅ — `findOrCreate` ahora devuelve `nombre_coincide`; `VentasPage.jsx` muestra aviso no bloqueante (⚠) junto al campo DNI.

**2.5 — Reportes validan `fecha_inicio > fecha_hasta`** ✅ — nueva `validarRangoFecha()` en `reporte.controller.js`, usada dentro de `armarWhereFecha` (lanza `{status, mensaje}`, capturado en los 4 endpoints que la llaman) y directamente en `margenProductos`/`mermasPorMotivo` (que arman su SQL crudo aparte).

**2.6 — Modal "Detalle de Ventas" del dashboard solo cuenta Completadas** ✅ — se agregó soporte de filtro `estado` a `venta.controller.js:listar`, y `DashboardPage.jsx` ahora pide `estado: 'Completada'` al cargar `ventasDelMes`.

**2.7 — Contrato de cambiar contraseña aclarado** ✅ — ruta renombrada de `PATCH /usuarios/:id/password` a `PATCH /usuarios/me/password` (confirmado que ningún frontend la consumía, cambio sin impacto). El controller sigue operando solo sobre `req.usuario.id`.

**2.8 — Invalidación de caché de Configuración** ✅ — `useConfiguracion.js` ahora escucha un evento de `window` (`minimarket-configuracion-actualizada`); `ConfiguracionPage.jsx` lo dispara (`notificarConfiguracionActualizada()`) tras guardar con éxito. Mismo patrón liviano que ya usa `StockSyncContext` para el stock.

**2.9 — Permiso muerto de Gerente en inventario** ✅ — se quitó `'Gerente'` de los 3 `GET` (`/entradas`, `/bajas`, `/ajustes`) en `inventario.routes.js`; `GET /solicitudes` se dejó igual (Gerente sí tiene acceso documentado y real ahí).

---

## Fase 3 — Bajo ✅

- **3.1** ✅ `reactivar()` en `usuario.controller.js` limpia `intentos_fallidos`/`bloqueo_hasta`.
- **3.2** ✅ `monto_recibido` se normaliza con `.toFixed(2)` antes de guardar.
- **3.3** ✅ Cubierto como parte de 2.1: `consulta.service.js` tiene `requireToken()`, que corta con `500` explícito si `APIS_PERU_TOKEN` no está configurado, en vez de mandar `Bearer undefined`.
- **3.4** ✅ `presentarMargenProducto`: costo `0` con ingreso `> 0` ahora da `margen_pct: 100` (antes `null`); `costo 0 e ingreso 0` sigue en `null`.

---

## Fase 4 — Correlativo real de boleta/factura por serie ✅

Antes usaba el `id` autoincremental global de `Venta` como "número de comprobante", compartido entre boletas y facturas — al intercalarse ambos tipos, cada serie quedaba con huecos en su numeración. Se implementó un contador atómico real por serie:

- **`server/models/Configuracion.js`**: nuevos campos `correlativo_boleta` y `correlativo_factura` (INTEGER, default 0).
- **`server/models/Venta.js`**: nuevos campos `numero_comprobante` (INTEGER) y `serie_comprobante` (STRING) — se guarda la serie realmente usada al emitir, para que un cambio posterior de la serie en Configuración no altere el número ya asignado a una venta pasada. Ambos nulos en ventas anteriores a este cambio (no tienen numeración real).
- **`server/controllers/venta.controller.js:registrar()`**: dentro de la misma transacción que crea la venta, bloquea la fila de `Configuracion` (`lock: t.LOCK.UPDATE`), incrementa el contador correspondiente (`correlativo_boleta` o `correlativo_factura` según `tipo_comprobante`) y lo asigna a la venta junto con la serie vigente. El lock serializa ventas concurrentes — nunca se repite ni se salta un número.
- **`server/presenters/venta.presenter.js`**: expone `numero_comprobante`/`serie_comprobante`.
- **`client/src/utils/comprobante.js:construirNumeroComprobante`**: usa el correlativo real si existe; si no (ventas históricas), cae al comportamiento anterior basado en `venta.id` como respaldo de compatibilidad.
- Verificado: `sync({ alter: true })` aplicado en vivo contra la base real (columnas creadas con los tipos/defaults correctos) y la lógica de incremento probada en una transacción con rollback (sin efectos secundarios reales).

## Fase 5 — Cantidad parcial en solicitudes de reposición ✅

Antes, si llegaba menos cantidad de la pedida al completar una solicitud, el resto se perdía silenciosamente (la solicitud quedaba "Completada" sin ningún registro del faltante). Implementado con el enfoque ya recomendado en su momento: generar automáticamente una nueva solicitud por la diferencia.

- **`server/models/SolicitudReposicion.js`**: nuevo campo `solicitud_origen_id` (auto-referencia, nullable) para trazar de qué solicitud completada-parcialmente nació una solicitud de seguimiento.
- **`server/models/index.js`**: asociación `SolicitudReposicion.belongsTo(SolicitudReposicion, { as: 'origen' })` / `hasMany(..., { as: 'seguimientos' })`.
- **`server/controllers/inventario.controller.js:completarSolicitud`**: si `cantidad_recibida < solicitud.cantidad`, dentro de la misma transacción crea una nueva `SolicitudReposicion` (`estado: 'Pendiente'`, mismo producto/proveedor, `cantidad` = la diferencia, `solicitud_origen_id` = la original). La respuesta del endpoint incluye `solicitud_seguimiento` cuando esto ocurre.
- **`server/presenters/inventario.presenter.js`**: expone `solicitud_origen_id` en `presentarSolicitud`.
- **`client/src/modules/solicitudes/SolicitudesPage.jsx`**: `ModalCompletar` pasa la respuesta completa a `onCompletada`; el toast de éxito ahora menciona explícitamente cuántas unidades quedaron pendientes en la nueva solicitud generada, en vez de un mensaje genérico.
- Verificado: `sync({ alter: true })` aplicado en vivo contra la base real (columna `solicitud_origen_id` creada correctamente).

## Verificación realizada

- Backend: cada archivo tocado se verificó con `node -e "require('./archivo.js')"` tras cada fix (sin arrancar `app.js`, que sí levanta el servidor real).
- La query de zona horaria de 1.9 se probó en vivo contra la base de datos real (no solo sintaxis).
- Los cambios de esquema de Fase 4 y 5 (`Configuracion`, `Venta`, `SolicitudReposicion`) se aplicaron con `sync({ alter: true })` contra la base real y se confirmaron las columnas resultantes por `information_schema`.
- La asignación de correlativo (Fase 4) se probó de punta a punta en una transacción real con `rollback` (lock + incremento + lectura), sin dejar efectos secundarios.
- Frontend: `npm run build` limpio al cierre de cada fase (0+1, 2+3, 4+5).

## Smoke test en navegador — ✅ EJECUTADO (contra la base real, logueado como SuperAdmin)

Entorno local levantado (`npm run dev`, backend :3000 + frontend :5173) y probado con Playwright contra la base de datos real. Resultado de cada flujo:

| Flujo | Resultado |
|---|---|
| Abrir turno S/200 → venta en efectivo → efectivo esperado | ✅ S/202.50 exacto (200 + 2.50), sin duplicar (Fase 0.1) |
| Vuelto insuficiente | ✅ Bloqueado con "Monto en caja insuficiente para el vuelto. Disponible: S/. 200.00" |
| Correlativo real de comprobante | ✅ Boleta emitida como **B001-00000001** (no el id de venta), PDF descargado con ese nombre (Fase 4) |
| Inventario → tab Ajustes, conteo con sobrante | ✅ Exigió fecha de vencimiento, quedó registrado (Fase 0.2 + 1.7) |
| Baja con motivo "Error de registro" | ✅ Disponible en el select y aceptado por el backend (Fase 1.5) |
| Costo unitario en Entradas / Completar Solicitud | ✅ Campo presente y funcional en ambos formularios (Fase 1.6) |
| Solicitud completada con cantidad parcial (15 de 24) | ✅ Se creó automáticamente una nueva solicitud "Pendiente" por 9 und(s), con el toast exacto (Fase 5) |
| `forgotPassword` con email inexistente | ✅ Avanzó igual al paso 2 (código), sin revelar que la cuenta no existe (Fase 1.2) |
| Venta con Factura + RUC inventado, llamando la API directo (bypaseando el frontend) | ✅ Rechazada por el backend: "RUC inaceptable: no se encontró información para ese número en SUNAT." (Fase 2.1) |
| Botones de Aprobar/Rechazar/Completar en Solicitudes como SuperAdmin | ✅ Visibles y funcionales (Fase 1.1) |

Sin errores de consola en ningún flujo. Servidor de desarrollo detenido y capturas de pantalla temporales eliminadas al terminar.
