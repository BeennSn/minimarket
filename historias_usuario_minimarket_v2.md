# Sistema de Gestión Minimarket

## Historias de Usuario y Criterios de Aceptación

### Sprints 1 al 4 — Documentación completa del sistema implementado

---

## Resumen de Sprints

| Sprint | Enfoque | HUs | Estado |
|--------|---------|-----|--------|
| **Sprint 1** | Fundación y Acceso | 6 | ⚠️ 4 Completadas / 2 Parciales |
| **Sprint 2** | Operaciones de Venta | 4 | ✅ 4 Completadas |
| **Sprint 3** | Inventario y Reposición | 4 | ⚠️ 4 Parciales |
| **Sprint 4** | Mejoras y Cierre | 6 | ❌ 3 Pendientes / 3 Parciales |
| **TOTAL** | | **20** | **12 completadas / 8 pendientes o parciales** |

---

## Sprint 1 — Fundación y Acceso

Establece las bases del sistema: autenticación, gestión de usuarios, productos, categorías y proveedores.

---

### HU-01 — Autenticación: login, logout y sesión por rol — ✅ Completado

Como usuario del sistema, quiero poder iniciar y cerrar sesión con mis credenciales para acceder a las funciones según mi rol asignado.

**Criterios de aceptación:**

- El sistema permite iniciar sesión con email y contraseña válidos.
- Al ingresar credenciales incorrectas se muestra el mensaje 'Credenciales incorrectas' sin revelar cuál campo falló.
- Al autenticarse correctamente se genera un token JWT con expiración configurable.
- El sistema redirige al usuario a la vista correspondiente según su rol: Administrador y Gerente al Dashboard, Vendedor al POS, Almacenero al Inventario.
- El token se almacena en localStorage y se envía en el header Authorization de cada petición.
- Al cerrar sesión se elimina el token y se redirige al login.
- Las rutas protegidas redirigen al login si no hay token válido.
- Se registra el acceso en la tabla log_accesos con usuario, rol y fecha/hora.

---

### HU-02 — Gestión de usuarios: CRUD, roles y soft delete — ⚠️ Parcial

Como administrador, quiero poder crear, editar, desactivar y reactivar usuarios del sistema asignándoles roles específicos.

**Criterios de aceptación:**

- Solo el Administrador puede acceder al módulo de usuarios.
- Se pueden crear usuarios con los roles: Administrador, Vendedor, Almacenero, Gerente.
- Al crear un usuario el sistema valida que el email no esté registrado previamente.
- La contraseña se almacena hasheada con bcrypt (salt ≥ 10).
- Se pueden editar nombre, email y rol de un usuario.
- El administrador puede cambiar su propia contraseña ingresando la contraseña actual.
- La desactivación es un soft delete: el campo activo se pone en false sin eliminar el registro.
- Los usuarios desactivados no pueden iniciar sesión.
- Un administrador no puede desactivarse a sí mismo.
- Se pueden reactivar usuarios previamente desactivados.

**Nota:** Implementado completamente en frontend. En backend falta la validación que impida que un administrador se autodesactive vía API directa. Además, aunque existe el endpoint y controlador para cambio de contraseña (`PATCH /:id/password`), no hay interfaz gráfica para usarlo.

---

### HU-03 — Recuperación de contraseña por email — ✅ Completado

Como usuario, quiero poder recuperar mi contraseña mediante un código enviado a mi correo electrónico.

**Criterios de aceptación:**

- El usuario ingresa su email en el formulario de recuperación.
- El sistema siempre responde con el mismo mensaje independientemente de si el email existe o no, para no revelar información.
- Si el email existe y está activo, se genera un código de 6 dígitos aleatorio.
- El código tiene una expiración de 15 minutos desde su generación.
- Se envía un correo HTML con el código destacado y la indicación de expiración.
- El usuario ingresa el código y su nueva contraseña.
- El sistema valida que el código coincida y no esté expirado.
- Al confirmar exitosamente se actualiza la contraseña y se invalida el código.
- Si el código es incorrecto o expirado se muestra el mensaje 'Código inválido o expirado'.

---

### HU-04 — Gestión de categorías y productos — ✅ Completado

Como administrador o almacenero, quiero poder gestionar las categorías y productos del minimarket para mantener el catálogo actualizado.

**Criterios de aceptación:**

- Se pueden crear, editar y eliminar categorías con nombre único.
- No se puede eliminar una categoría que tenga productos asociados.
- Se pueden crear productos con: nombre, marca, categoría, precio y stock inicial.
- El precio debe ser mayor a 0.01.
- Se puede editar nombre, marca, categoría y precio de un producto.
- La desactivación de productos es soft delete (activo: false).
- Los productos desactivados no aparecen en el POS.
- Las filas de productos con stock 0 se muestran en rojo en la tabla.
- Las filas de productos con stock entre 1 y 5 se muestran en amarillo.
- Se pueden reactivar productos previamente desactivados.
- Hay filtros por categoría, estado y buscador por nombre o marca.

---

### HU-05 — Gestión de proveedores — ✅ Completado

Como administrador o almacenero, quiero poder registrar y gestionar los proveedores del minimarket.

**Criterios de aceptación:**

- Se pueden crear proveedores con: nombre, RUC y contacto opcional.
- El RUC debe tener exactamente 11 dígitos numéricos.
- No se pueden registrar dos proveedores con el mismo RUC.
- Se pueden editar nombre, RUC y contacto de un proveedor.
- Si se edita el RUC se valida que no esté en uso por otro proveedor.
- La desactivación es soft delete (activo: false).
- Se pueden reactivar proveedores previamente desactivados.
- Hay buscador por nombre o RUC y filtro por estado.

---

### HU-06 — Alertas visuales de stock crítico en inventario — ⚠️ Parcial

Como almacenero o administrador, quiero ver alertas visuales cuando el stock de un producto sea bajo para tomar acciones a tiempo.

**Criterios de aceptación:**

- Los productos con stock igual a 0 se resaltan en rojo en la tabla de productos.
- Los productos con stock entre 1 y 5 se resaltan en amarillo.
- El dashboard muestra el contador de productos sin stock.
- El módulo de reportes permite consultar stock crítico con umbral configurable.
- La lista de stock crítico muestra nombre, marca y stock actual de cada producto.
- Si no hay productos críticos se muestra el mensaje '✓ Todo el stock está en orden'.

**Nota:** Las alertas están implementadas en la página de productos (banners, colores en tabla) y en el Dashboard (KPI "Sin Stock", tarjeta "Stock crítico"). Sin embargo, en la página de **Reportes** no existe la sección de stock crítico — actualmente Reportes solo contiene reportes de ventas.

---

## Sprint 2 — Operaciones de Venta

Implementa el núcleo comercial del sistema: el punto de venta, registro de ventas y gestión de clientes.

---

### HU-07 — Punto de venta: registro, métodos de pago y vuelto — ✅ Completado

Como vendedor, quiero registrar ventas con múltiples productos, seleccionar el método de pago y calcular el vuelto automáticamente.

**Criterios de aceptación:**

- El vendedor puede buscar productos por nombre o marca en tiempo real.
- Los productos sin stock aparecen deshabilitados en los resultados.
- Al seleccionar un producto se agrega al carrito; si ya existe se incrementa la cantidad.
- La cantidad en el carrito no puede superar el stock disponible.
- Se puede aumentar, disminuir o eliminar items del carrito.
- El total se calcula automáticamente en tiempo real.
- Los métodos de pago disponibles son: Efectivo, Yape y Plin.
- Si el método es Efectivo se muestra el campo de monto recibido.
- El vuelto se calcula automáticamente: monto recibido menos total.
- El botón 'Realizar Venta' se deshabilita si el carrito está vacío.
- Si el método es Efectivo y el monto recibido es insuficiente el botón se deshabilita.
- Al confirmar la venta se descuenta el stock de cada producto automáticamente.
- La venta usa una transacción ACID: si algo falla no se guarda ningún dato parcial.

---

### HU-08 — Gestión de clientes y comprobante de venta — ✅ Completado

Como vendedor, quiero poder registrar el cliente de la venta y obtener un comprobante al finalizar.

**Criterios de aceptación:**

- El vendedor puede buscar un cliente por DNI antes de registrar la venta.
- Si el cliente no existe con ese DNI se crea automáticamente.
- El cliente es opcional; si no se especifica la venta se registra sin cliente.
- Al finalizar la venta se muestra un modal de comprobante con: número de venta, productos, cantidades, total, método de pago y vuelto si aplica.
- El modal muestra el nombre del cliente si fue especificado.
- El botón 'Nueva Venta' cierra el modal y resetea completamente el carrito.
- El número de venta se muestra con formato 00{id}.

---

### HU-09 — Descuento automático de stock al vender — ✅ Completado

Como sistema, debo descontar el stock de cada producto vendido automáticamente al registrar una venta.

**Criterios de aceptación:**

- Al registrar una venta el stock de cada producto se descuenta por la cantidad vendida.
- Si no hay stock suficiente para algún producto la venta completa se rechaza con el mensaje 'Stock insuficiente para: {nombre}'.
- El descuento ocurre dentro de la misma transacción que el registro de la venta.
- Los productos llegan a stock 0 pero nunca a negativo.
- El stock actualizado se refleja inmediatamente en la tabla de productos.

---

### HU-10 — Búsqueda de producto por nombre en POS — ✅ Completado

Como vendedor, quiero buscar productos rápidamente por nombre o marca desde el punto de venta.

**Criterios de aceptación:**

- El buscador filtra productos en tiempo real mientras el vendedor escribe.
- Los resultados muestran: nombre, marca, precio y stock disponible.
- Solo se muestran productos activos en el buscador del POS.
- Los productos con stock 0 aparecen deshabilitados y no se pueden agregar.
- Al seleccionar un resultado el buscador se limpia y el dropdown se cierra.
- El buscador es compatible con búsquedas parciales (no requiere texto exacto).

---

## Sprint 3 — Inventario y Reposición

Gestión completa del inventario: entradas de mercadería, bajas y solicitudes de reposición entre roles.

---

### HU-11 — Entradas y bajas de inventario con historial — ⚠️ Parcial

Como almacenero, quiero registrar entradas de mercadería de proveedores y bajas de productos por merma o vencimiento.

**Criterios de aceptación:**

- El almacenero puede registrar una entrada seleccionando producto, proveedor y cantidad.
- La cantidad de una entrada debe ser mayor a 0.
- El producto debe estar activo para registrar una entrada.
- Al registrar una entrada el stock del producto se incrementa automáticamente dentro de una transacción.
- Se puede ver el historial de entradas con filtros por fecha y producto.
- El almacenero puede registrar una baja seleccionando producto, cantidad y motivo.
- La cantidad de la baja no puede superar el stock actual del producto.
- Al registrar una baja el stock se descuenta automáticamente dentro de una transacción.
- Se puede ver el historial de bajas con filtros por fecha y producto.
- Tanto entradas como bajas registran el usuario que realizó la operación y la fecha/hora.

**Nota:** El backend soporta filtros por fecha y producto en los endpoints de historial (`inventario.controller.js:listarEntradas/listarBajas`), pero el frontend (`InventarioPage.jsx`) no expone filtros visuales (date picker, selector de producto) para las tablas de historial.

---

### HU-12 — Solicitudes de reposición: crear y gestionar — ⚠️ Parcial

Como almacenero, quiero crear solicitudes de reposición de productos cuando el stock esté bajo para que sean revisadas por el gerente o administrador.

**Criterios de aceptación:**

- El almacenero puede crear una solicitud indicando producto, cantidad y proveedor sugerido opcional.
- La cantidad solicitada debe ser mayor a 0.
- Las solicitudes se crean con estado 'Pendiente' por defecto.
- Se puede filtrar la lista de solicitudes por estado: Pendiente, Aprobada, Rechazada, Completada.
- Cada solicitud muestra: producto, cantidad, estado, proveedor, fecha estimada, solicitante y aprobador.
- Los badges de estado tienen colores diferenciados: Pendiente en amarillo, Aprobada en verde, Rechazada en rojo, Completada en gris.

**Nota:** La columna de **aprobador** no se muestra en la tabla del frontend, aunque el backend envía el dato en la respuesta. El resto de campos y filtros están implementados.

---

### HU-13 — Aprobación, rechazo y completado de solicitudes — ⚠️ Parcial

Como administrador o gerente, quiero aprobar o rechazar solicitudes de reposición; como almacenero quiero marcarlas como completadas al recibir la mercadería.

**Criterios de aceptación:**

- Solo el Administrador y el Gerente pueden aprobar o rechazar solicitudes.
- Al aprobar se debe indicar proveedor y fecha estimada de llegada.
- Solo se pueden aprobar solicitudes en estado 'Pendiente'.
- Al rechazar se debe ingresar un motivo de rechazo obligatorio.
- Solo se pueden rechazar solicitudes en estado 'Pendiente'.
- El almacenero y el Administrador pueden marcar una solicitud como 'Completada'.
- Solo se pueden completar solicitudes en estado 'Aprobada'.
- El sistema registra quién aprobó o rechazó la solicitud.
- Se muestra el motivo de rechazo visible en la tabla para solicitudes rechazadas.

**Nota:** Toda la lógica de backend está implementada: el modelo `SolicitudReposicion` tiene `usuario_aprobador_id`, el controlador lo registra, y el presentador lo expone. Sin embargo, el nombre del aprobador **no se renderiza** en la tabla del frontend.

---

### HU-14 — Notificación de stock crítico al almacenero — ⚠️ Parcial

Como almacenero, quiero ver de forma destacada los productos con stock crítico para priorizar las solicitudes de reposición.

**Criterios de aceptación:**

- El dashboard muestra el total de solicitudes pendientes como KPI.
- El módulo de reportes muestra una sección de stock crítico con umbral configurable (default 5).
- Al cambiar el umbral la lista se actualiza automáticamente.
- Los productos con stock 0 se muestran con badge rojo 'Sin stock'.
- Los productos con stock entre 1 y el umbral se muestran con badge amarillo.
- Si no hay productos críticos se muestra mensaje verde '✓ Todo el stock está en orden'.

**Nota:** El Dashboard muestra correctamente el KPI de solicitudes pendientes y la tarjeta de stock crítico, pero:
1. La sección de stock crítico **no existe** en la página de Reportes (solo hay reportes de ventas).
2. El umbral está **hardcodeado a 5** en el frontend; no hay control de usuario para cambiarlo dinámicamente.

---

## Sprint 4 — Mejoras y Cierre

Contiene las historias de usuario de los sprints 4 y 5 originales que aún no han sido implementadas completamente.

---

### HU-16 — Gráficos de ventas por día y método de pago — ⚠️ Parcial

> *Proveniente del Sprint 4 original — Reportes y Dashboards*

Como gerente, quiero visualizar la evolución de ventas diarias y la distribución por método de pago en gráficos interactivos.

**Criterios de aceptación:**

- El gráfico de ventas por día muestra el monto total por cada día en un AreaChart.
- El eje X muestra la fecha en formato DD/MM y el eje Y muestra el monto en S./.
- El tooltip muestra la fecha completa y el monto al pasar el cursor.
- El gráfico de métodos de pago usa un PieChart con colores distintos por método.
- Los métodos disponibles son: Efectivo, Yape y Plin.
- Ambos gráficos responden a los filtros de fecha aplicados.
- Si no hay datos en el período se muestra mensaje informativo.

**Nota:** El AreaChart de ventas por día existe solo en el **Dashboard**, no en la página de Reportes (que usa tablas). El **PieChart** de métodos de pago no se ha implementado en ninguna parte del proyecto — solo existe una tabla plana.

---

### HU-19 — Carga masiva de productos por Excel/CSV — ❌ Pendiente

> *Proveniente del Sprint 5 original — Funcionalidades Avanzadas*

Como administrador, quiero poder importar múltiples productos desde un archivo Excel o CSV para agilizar la carga inicial del catálogo.

**Criterios de aceptación:**

- El sistema acepta archivos .xlsx y .csv.
- El archivo debe tener las columnas: nombre, marca, categoria, precio, stock.
- Se valida cada fila antes de insertar: precio > 0, stock >= 0, categoría existente.
- Las filas con error se reportan con el número de fila y el motivo del error.
- Las filas válidas se insertan aunque haya filas con error.
- Se muestra un resumen al finalizar: total procesadas, insertadas y con error.
- Se puede descargar una plantilla de ejemplo del formato esperado.

**Nota:** No se encontró ninguna implementación de carga masiva en el proyecto (no hay dependencias como `multer`, `xlsx` ni rutas de upload).

---

### HU-21 — Exportar reportes a PDF y Excel — ⚠️ Parcial

> *Proveniente del Sprint 5 original — Funcionalidades Avanzadas*

Como gerente, quiero poder exportar los reportes en formato PDF y Excel para compartirlos o archivarlos.

**Criterios de aceptación:**

- Se puede exportar el resumen de ventas a PDF con logo y fecha de generación.
- Se puede exportar el top de productos a Excel con formato de tabla.
- El PDF incluye los filtros de fecha aplicados en el encabezado.
- El Excel incluye todas las columnas visibles en la tabla.
- Los archivos se descargan directamente al equipo del usuario.
- Los botones de exportación están disponibles en el módulo de reportes.

**Nota:** La exportación a **PDF** está completamente implementada vía `jspdf` + `jspdf-autotable`. La exportación a **Excel** no se ha implementado (no hay dependencias como `xlsx` ni botón de exportación Excel).

---

### HU-22 — Backup automático diario con pg_dump — ❌ Pendiente

> *Proveniente del Sprint 5 original — Funcionalidades Avanzadas*

Como administrador, quiero que el sistema realice backups automáticos diarios de la base de datos para proteger la información.

**Criterios de aceptación:**

- El backup se ejecuta automáticamente todos los días a las 2:00 AM.
- Se usa pg_dump para generar el archivo de backup.
- Los archivos se guardan en la carpeta backups/ con nombre que incluye la fecha.
- Se conservan los últimos 7 backups y se eliminan los más antiguos.
- Si el backup falla se registra el error en consola.
- El cron job se activa automáticamente al iniciar el servidor.

**Nota:** El directorio `server/jobs/` está vacío (solo contiene `.gitkeep`). No existe ningún cron job, tarea programada ni script de backup en el proyecto.

---

### HU-23 — Descarga manual de backup desde el panel — ❌ Pendiente

> *Proveniente del Sprint 5 original — Funcionalidades Avanzadas*

Como administrador, quiero poder generar y descargar un backup manualmente desde el panel de administración.

**Criterios de aceptación:**

- El administrador puede triggear un backup manual desde la interfaz.
- Al generarse el backup se descarga automáticamente como archivo .sql.
- El nombre del archivo incluye la fecha y hora de generación.
- Solo el rol Administrador tiene acceso a esta función.
- Si el proceso falla se muestra un mensaje de error descriptivo.

**Nota:** No se encontró ningún endpoint, controlador, ruta o componente de frontend relacionado con descarga de backups.

---

### HU-24 — Historial de accesos y auditoría por usuario — ⚠️ Parcial

> *Proveniente del Sprint 5 original — Funcionalidades Avanzadas*

Como administrador, quiero ver un historial de accesos al sistema para auditar el uso por usuario y detectar accesos no autorizados.

**Criterios de aceptación:**

- Se registra cada inicio de sesión exitoso con: usuario, rol y fecha/hora.
- El administrador puede ver el historial completo de accesos.
- Se puede filtrar por usuario, rol y rango de fechas.
- Los registros se muestran en orden cronológico descendente.
- El historial no se puede editar ni eliminar desde la interfaz.

**Nota:** El **modelo** `LogAcceso` y el **registro** en cada inicio de sesión están implementados en el backend. Sin embargo, **no existe un endpoint** para consultar los logs, ni una **vista de administrador** en el frontend para visualizar o filtrar el historial de accesos.

---

## Estado general del proyecto

| Indicador | Valor |
|-----------|-------|
| **Total HUs** | 20 |
| **✅ Total implementadas** | 12 |
| **⚠️ Parciales** | 5 |
| **❌ Pendientes** | 3 |
| **Porcentaje de avance** | 60 % (completadas) / 85 % (completadas + parciales) |

### Leyenda de estados

| Estado | Significado |
|--------|------------|
| ✅ Completado | Todos los criterios de aceptación están implementados |
| ⚠️ Parcial | La mayoría de criterios están implementados, pero faltan detalles específicos |
| ❌ Pendiente | No se encontró implementación en el código del proyecto |
