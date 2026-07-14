# Minimarket — Contexto del Proyecto

Sistema de gestión integral para minimarket/tienda: ventas (POS), inventario con
lotes y vencimientos, caja, clientes, proveedores, reportes y control de acceso
por roles. Monorepo con backend Node/Express/Sequelize (PostgreSQL) y frontend
React (Vite + Tailwind), desplegado en Vercel (serverless).

## Stack técnico

**Backend** (`server/`)
- Node.js + Express 5
- Sequelize 6 ORM sobre PostgreSQL (`pg`, pensado para Neon en producción)
- Autenticación JWT (`jsonwebtoken`) + `bcryptjs` para hashing
- `express-rate-limit` en rutas de auth
- `node-cron` para jobs programados
- `nodemailer` para recuperación de contraseña por email
- `libphonenumber-js` para validar teléfonos
- Consulta de RUC/DNI vía API externa (decolecta.com, token `APIS_PERU_TOKEN`)

**Frontend** (`client/`)
- React 18 + React Router 6, Vite 5, Tailwind CSS 3
- `axios` para llamadas HTTP
- `@zxing/browser` + `@zxing/library` para escaneo de código de barras
- `jspdf` / `jspdf-autotable` / `html2pdf.js` para boletas/facturas y reportes en PDF
- `qrcode` para generar QR (pago Yape)
- `recharts` para gráficos del dashboard
- `lucide-react` para iconos

**Despliegue**
- Vercel: build del cliente a `client/dist`, función serverless única en
  `api/index.js` que reexporta `server/app.js`, rewrites de `/api/*` hacia esa función
  (ver [vercel.json](vercel.json)).
- `server/app.js` detecta `process.env.VERCEL` para: confiar en el proxy (`trust proxy`)
  y no levantar `app.listen` (en serverless cada invocación es manejada por Vercel).
- Al arrancar, siempre corre `sequelize.sync({ alter: true })` — útil en desarrollo/
  MVP para crear columnas nuevas automáticamente, pero corre en cada cold start de
  producción también. Hay un timeout corto (4s) para no colgar requests si el sync
  tarda (ver comentarios en [server/app.js](server/app.js)).
- Pool de conexiones Sequelize deliberadamente pequeño (`max: 3`) por las
  limitaciones de conexiones concurrentes en serverless (ver [server/config/db.js](server/config/db.js)).

## Cómo correr el proyecto

```bash
npm install && cd client && npm install   # o: npm run installCommand de vercel.json
npm run dev      # levanta server (nodemon) + client (vite) en paralelo (concurrently)
npm run build    # build de producción del client
npm run db:reset # limpia y re-siembra la BD (scripts server/scripts/limpiar_bd.js y sembrar_datos.js)
```

Variables de entorno (`.env` en la raíz, ver [.env.example](.env.example)):
`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, `DB_SSL`, `CORS_ORIGIN`
(opcional), `SMTP_HOST/PORT/USER/PASS` (opcional, recuperación de contraseña),
`APIS_PERU_TOKEN` (opcional, consulta DNI/RUC).

No hay README en el repo — este archivo cumple ese rol.

## Roles y control de acceso

Roles definidos en el enum de `Usuario.rol`: **Administrador, Vendedor,
Almacenero, Gerente, SuperAdmin**. `SuperAdmin` satisface automáticamente
cualquier permiso que requiera `Administrador`, más gestión exclusiva de usuarios
(ver `verificarRol` en [server/middlewares/auth.middleware.js](server/middlewares/auth.middleware.js)).

Acceso por módulo (rutas del frontend en [client/src/App.jsx](client/src/App.jsx),
reflejando los mismos roles que exige cada ruta backend):

| Módulo | Roles con acceso |
|---|---|
| Dashboard | Gerente, Administrador |
| Usuarios | Administrador |
| Logs de acceso | Administrador |
| Categorías | Administrador, Almacenero |
| Productos | Administrador, Almacenero |
| Proveedores | Administrador, Almacenero |
| Ventas | Vendedor, Administrador, Gerente |
| Historial de ventas | Administrador, Gerente, Vendedor |
| Inventario | Almacenero, Administrador |
| Solicitudes (reposición) | Almacenero, Administrador, Gerente |
| Reportes | Gerente, Administrador |
| Configuración | Administrador |
| Caja | Vendedor, Administrador |
| Historial de caja | Administrador, Gerente |
| Clientes | Administrador, Gerente |

**Autenticación**: JWT con `session_version` embebido (`sv`). Cambiar contraseña,
forzar cierre de sesión, o iniciar sesión en otro dispositivo incrementa
`session_version` en BD, invalidando cualquier token viejo de inmediato (sin
esperar expiración). Solo se permite **una sesión activa a la vez** por usuario
(login nuevo cierra la sesión anterior). Bloqueo temporal tras intentos fallidos
(`intentos_fallidos`, `bloqueo_hasta`).

## Dominio y modelo de datos

Modelos Sequelize en [server/models/](server/models/), asociaciones centralizadas
en [server/models/index.js](server/models/index.js).

**Catálogo**
- `Categoria`, `Proveedor`, `Producto` (con `codigo_barras`, `stock`,
  `stock_minimo`, `costo_promedio`, `unidad_compra` + `factor_conversion` para
  compras por caja/paquete/docena convertidas a unidades).
- `Cliente`.

**Inventario por lotes (FEFO)**
- `EntradaMercaderia`: cada lote de mercadería recibido, con `cantidad`,
  `cantidad_restante`, `fecha_vencimiento`, `costo_unitario`. Puede originarse de
  una `SolicitudReposicion` o de un `AjusteInventario` positivo.
- `ConsumoLote`: registro de consumo de cada lote (por venta, baja o ajuste
  negativo), permite trazabilidad y reversión exacta.
- `BajaInventario`: baja de stock (mermas, vencidos, etc.).
- `AjusteInventario`: correcciones manuales de stock (positivas o negativas).
- `SolicitudReposicion`: pedido de reposición a proveedor, con solicitante y
  aprobador (ambos `Usuario`).

La lógica central de inventario vive en
[server/services/inventario.service.js](server/services/inventario.service.js):
- `crearLote`: registra una entrada y actualiza `costo_promedio` (promedio
  ponderado) y `stock` del producto.
- `consumirStockFIFO`: consume lotes en orden **FEFO** (first-expired,
  first-out: por `fecha_vencimiento ASC NULLS LAST`, luego `createdAt ASC`).
  Con `soloVigente: true` (usado en ventas) excluye lotes ya vencidos —no se
  puede vender producto vencido—; bajas/ajustes sí pueden tocar stock vencido.
  Un lote que vence *hoy* ya no se considera vigente (regla de negocio).
- `revertirConsumo`: revierte consumos de lotes al anular una venta o baja,
  restaurando `cantidad_restante` y `stock` exactamente como estaban.
- `calcularStockVigente`: suma solo lo no vencido, para avisar de stock vencido
  antes de intentar la transacción de venta.

**Ventas**
- `Venta`: método de pago (Efectivo/Yape, con montos mixtos y vuelto), tipo de
  comprobante (Boleta/Factura) con datos de cliente (DNI/RUC/razón social),
  verificación manual de pagos Yape (`yape_verificado`, quién y cuándo), estado
  (Completada/Anulada) con motivo y auditoría de anulación, y asociación a un
  `Turno` de caja.
- `DetalleVenta`: líneas de la venta, ligadas a `Producto`.

**Caja**
- `Turno`: apertura/cierre de caja por cajero, con montos esperados vs.
  contados en efectivo y Yape, diferencia calculada, y aprobación opcional de un
  Administrador/Gerente. Índice único garantiza **un solo turno Abierto por
  usuario** a la vez.
- `MovimientoCaja`: movimientos de caja ligados a un turno (y opcionalmente a
  una venta).

**Otros**
- `LogAcceso`: auditoría de accesos/acciones de usuarios.
- `Configuracion`: parámetros configurables del sistema (clave-valor, gestionado
  desde el módulo Configuración).

## Backend — estructura por capas

Cada dominio sigue el patrón **routes → controller → (service) → model →
presenter**:
- `server/routes/*.routes.js`: define endpoints, aplica `verificarToken` +
  `verificarRol` por ruta.
- `server/controllers/*.controller.js`: lógica de request/response, transacciones
  Sequelize para operaciones multi-tabla (ventas, inventario).
- `server/services/`: lógica de dominio reutilizable (`inventario.service.js`,
  `barcodeService.js` para búsqueda externa de productos por código de barras,
  `mail.service.js` para envío de correos).
- `server/presenters/*.presenter.js`: dan forma a la respuesta JSON expuesta al
  frontend (separado del modelo Sequelize interno).
- `server/middlewares/auth.middleware.js`: `verificarToken`, `verificarRol`.
- `server/scripts/`: utilidades de mantenimiento ejecutadas manualmente
  (migraciones puntuales, limpieza/siembra de BD, backup, cierre forzado de
  sesiones).
- `server/seeders/`: `adminSeed.js` (se corre automáticamente al sincronizar BD,
  crea el usuario admin inicial si no existe) y `datosPrueba.js` (crea los
  usuarios de prueba Vendedor/Almacenero/Gerente que requiere
  `scripts/sembrar_datos.js`, ver `npm run seed:datos` / `db:sembrar` /
  `db:reset`).

Endpoints montados en [server/app.js](server/app.js): `/api/auth`,
`/api/usuarios`, `/api/categorias`, `/api/productos`, `/api/proveedores`,
`/api/ventas`, `/api/clientes`, `/api/inventario`, `/api/reportes`,
`/api/configuracion`, `/api/caja`, `/api/consulta` (DNI/RUC externo),
`/api/logs-acceso`.

## Frontend — estructura

- [client/src/App.jsx](client/src/App.jsx): rutas con React Router, todas las
  páginas (excepto Login/ResetPassword) van dentro de `PrivateRoute` +
  `MainLayout`, y cada una vuelve a envolverse en `PrivateRoute roles={[...]}`
  para el control de acceso por rol. Páginas cargadas con `lazy()` para code
  splitting (spinner de carga en `MainLayout`).
- `client/src/modules/<dominio>/`: una carpeta por dominio de negocio (auth,
  dashboard, usuarios, logs, categorias, productos, proveedores, ventas,
  inventario, solicitudes, reportes, configuracion, caja, clientes), cada una
  con su(s) página(s) `.jsx`.
- `client/src/context/`: `AuthContext` (sesión/usuario/rol actual),
  `StockSyncContext` (sincronización de stock entre vistas, p.ej. tras una venta).
- `client/src/components/`: `MainLayout` (sidebar + layout responsive),
  `PrivateRoute`, `Breadcrumb`, `ConfirmDialog`, `Spinner`, `Toast`.
- `client/src/hooks/`: `useConfiguracion`, `useToast`.
- `client/src/utils/`: `axios.js` (instancia configurada), `comprobante.js`
  (generación de boletas/facturas PDF), `format.js`, `roles.js`.

## Convenciones y decisiones notadas en el código

- Comentarios en el código explican el *por qué*, no el *qué* — el estilo del
  proyecto ya sigue esa práctica (ver `inventario.service.js`, `app.js`,
  `db.js`, `auth.middleware.js`) y conviene mantenerla.
- Zona horaria: fechas de vencimiento comparadas con `hoyPeru()`
  ([server/utils/fechas.js](server/utils/fechas.js)) como comparación
  string-a-string (no instante), para evitar desfases de huso horario.
- Toda operación que toque stock e involucre más de una tabla usa transacciones
  Sequelize con `lock: t.LOCK.UPDATE` (fila bloqueada) para evitar condiciones de
  carrera sobre `stock`/`cantidad_restante`.
- El frontend usa `minimarket` (el paquete raíz) como dependencia local
  (`file:..`) tanto en `client` como en `server` — monorepo simple sin
  workspaces de npm/pnpm formales.

## Estado actual (según historial de commits)

~61 commits en `main`. Desarrollo reciente (commits más nuevos primero):
escaneo de código de barras y auto-completado de productos, gestión de
productos con seguimiento de stock por lotes, ruteo de la app con lazy loading
y sidebar responsive, rutas/controller de clientes, controllers de inventario.
Antes de eso: reportes con dashboard/analítica/exportación PDF, sistema de
lotes con lógica FEFO, boletas/facturas con QR Yape, historial de ventas con
filtros y exportación CSV, gestión de proveedores con validación SUNAT RUC,
logs de acceso, gestión de caja/turnos.

Módulos que aparentan estar completos end-to-end (ruta + controller + página):
auth, usuarios, logs de acceso, categorías, productos, proveedores, ventas
(+ historial), inventario, solicitudes, reportes, configuración, caja
(+ historial), clientes. No se detectó carpeta de tests automatizados.
