const sequelize = require('../config/db');

// ─── Importar modelos ─────────────────────────────────────────────────────────
const Usuario            = require('./Usuario');
const Categoria          = require('./Categoria');
const Producto           = require('./Producto');
const Proveedor          = require('./Proveedor');
const Cliente            = require('./Cliente');
const Venta              = require('./Venta');
const DetalleVenta       = require('./DetalleVenta');
const EntradaMercaderia  = require('./EntradaMercaderia');
const BajaInventario     = require('./BajaInventario');
const SolicitudReposicion = require('./SolicitudReposicion');
const LogAcceso          = require('./LogAcceso');
const Configuracion      = require('./Configuracion');
const Turno              = require('./Turno');
const MovimientoCaja     = require('./MovimientoCaja');
const ConsumoLote        = require('./ConsumoLote');
const AjusteInventario   = require('./AjusteInventario');

// ─── Asociaciones ─────────────────────────────────────────────────────────────

// Producto → Categoria
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto,   { foreignKey: 'categoria_id', as: 'productos' });

// Producto → Proveedor
Producto.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Proveedor.hasMany(Producto,   { foreignKey: 'proveedor_id', as: 'productos' });

// Venta → Usuario
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Venta,   { foreignKey: 'usuario_id', as: 'ventas' });

// Venta → Cliente
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(Venta,   { foreignKey: 'cliente_id', as: 'ventas' });

// Venta → Usuario (quien anuló)
Venta.belongsTo(Usuario, { foreignKey: 'anulado_por', as: 'anulador' });

// Venta → Turno (turno de caja bajo el cual se registró)
Venta.belongsTo(Turno, { foreignKey: 'turno_id', as: 'turno' });
Turno.hasMany(Venta,   { foreignKey: 'turno_id', as: 'ventas' });

// DetalleVenta → Venta
DetalleVenta.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Venta.hasMany(DetalleVenta,   { foreignKey: 'venta_id', as: 'detalles' });

// DetalleVenta → Producto
DetalleVenta.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(DetalleVenta,   { foreignKey: 'producto_id', as: 'detalles_venta' });

// EntradaMercaderia → Producto
EntradaMercaderia.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(EntradaMercaderia,   { foreignKey: 'producto_id', as: 'entradas' });

// EntradaMercaderia → Proveedor
EntradaMercaderia.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Proveedor.hasMany(EntradaMercaderia,   { foreignKey: 'proveedor_id', as: 'entradas' });

// EntradaMercaderia → Usuario
EntradaMercaderia.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(EntradaMercaderia,   { foreignKey: 'usuario_id', as: 'entradas' });

// EntradaMercaderia → SolicitudReposicion
EntradaMercaderia.belongsTo(SolicitudReposicion, { foreignKey: 'solicitud_id', as: 'solicitud' });
SolicitudReposicion.hasMany(EntradaMercaderia,   { foreignKey: 'solicitud_id', as: 'entradas' });

// ConsumoLote → EntradaMercaderia (lote)
ConsumoLote.belongsTo(EntradaMercaderia, { foreignKey: 'entrada_id', as: 'lote' });
EntradaMercaderia.hasMany(ConsumoLote,   { foreignKey: 'entrada_id', as: 'consumos' });

// ConsumoLote → DetalleVenta
ConsumoLote.belongsTo(DetalleVenta, { foreignKey: 'detalle_venta_id', as: 'detalleVenta' });
DetalleVenta.hasMany(ConsumoLote,   { foreignKey: 'detalle_venta_id', as: 'consumos' });

// ConsumoLote → BajaInventario
ConsumoLote.belongsTo(BajaInventario, { foreignKey: 'baja_id', as: 'baja' });
BajaInventario.hasMany(ConsumoLote,   { foreignKey: 'baja_id', as: 'consumos' });

// BajaInventario → Producto
BajaInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(BajaInventario,   { foreignKey: 'producto_id', as: 'bajas' });

// BajaInventario → Usuario
BajaInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(BajaInventario,   { foreignKey: 'usuario_id', as: 'bajas' });

// BajaInventario → Venta (si se originó al anular una venta sin reponer stock)
BajaInventario.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Venta.hasMany(BajaInventario,   { foreignKey: 'venta_id', as: 'bajas_generadas' });

// AjusteInventario → Producto
AjusteInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(AjusteInventario,   { foreignKey: 'producto_id', as: 'ajustes' });

// AjusteInventario → Usuario
AjusteInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(AjusteInventario,   { foreignKey: 'usuario_id', as: 'ajustes' });

// EntradaMercaderia → AjusteInventario (lote generado por un ajuste positivo)
EntradaMercaderia.belongsTo(AjusteInventario, { foreignKey: 'ajuste_id', as: 'ajuste' });
AjusteInventario.hasMany(EntradaMercaderia,   { foreignKey: 'ajuste_id', as: 'entradas' });

// ConsumoLote → AjusteInventario (consumo generado por un ajuste negativo)
ConsumoLote.belongsTo(AjusteInventario, { foreignKey: 'ajuste_id', as: 'ajuste' });
AjusteInventario.hasMany(ConsumoLote,   { foreignKey: 'ajuste_id', as: 'consumos' });

// SolicitudReposicion → Producto
SolicitudReposicion.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(SolicitudReposicion,   { foreignKey: 'producto_id', as: 'solicitudes' });

// SolicitudReposicion → Proveedor
SolicitudReposicion.belongsTo(Proveedor, { foreignKey: 'proveedor_id', as: 'proveedor' });
Proveedor.hasMany(SolicitudReposicion,   { foreignKey: 'proveedor_id', as: 'solicitudes' });

// SolicitudReposicion → Usuario (solicitante)
SolicitudReposicion.belongsTo(Usuario, {
  foreignKey: 'usuario_solicitante_id',
  as: 'solicitante',
});
Usuario.hasMany(SolicitudReposicion, {
  foreignKey: 'usuario_solicitante_id',
  as: 'solicitudes_realizadas',
});

// SolicitudReposicion → Usuario (aprobador)
SolicitudReposicion.belongsTo(Usuario, {
  foreignKey: 'usuario_aprobador_id',
  as: 'aprobador',
});
Usuario.hasMany(SolicitudReposicion, {
  foreignKey: 'usuario_aprobador_id',
  as: 'solicitudes_aprobadas',
});

// SolicitudReposicion → SolicitudReposicion (auto-referencia: solicitud de
// seguimiento generada cuando la original se completó con cantidad parcial)
SolicitudReposicion.belongsTo(SolicitudReposicion, {
  foreignKey: 'solicitud_origen_id',
  as: 'origen',
});
SolicitudReposicion.hasMany(SolicitudReposicion, {
  foreignKey: 'solicitud_origen_id',
  as: 'seguimientos',
});

// LogAcceso → Usuario
LogAcceso.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(LogAcceso,   { foreignKey: 'usuario_id', as: 'logs' });

// Turno → Usuario (cajero)
Turno.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'cajero' });
Usuario.hasMany(Turno,   { foreignKey: 'usuario_id', as: 'turnos' });

// Turno → Usuario (aprobador)
Turno.belongsTo(Usuario, { foreignKey: 'aprobado_por', as: 'aprobador' });

// Turno → Usuario (quien forzó el cierre, si no fue el propio cajero)
Turno.belongsTo(Usuario, { foreignKey: 'cerrado_por', as: 'cerrador' });

// MovimientoCaja → Turno
MovimientoCaja.belongsTo(Turno, { foreignKey: 'turno_id', as: 'turno' });
Turno.hasMany(MovimientoCaja,   { foreignKey: 'turno_id', as: 'movimientos' });

// MovimientoCaja → Venta
MovimientoCaja.belongsTo(Venta, { foreignKey: 'venta_id', as: 'venta' });
Venta.hasOne(MovimientoCaja,    { foreignKey: 'venta_id', as: 'movimiento_caja' });

// MovimientoCaja → Usuario
MovimientoCaja.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(MovimientoCaja,   { foreignKey: 'usuario_id', as: 'movimientos_caja' });

// ─── Exportar ─────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  Usuario,
  Categoria,
  Producto,
  Proveedor,
  Cliente,
  Venta,
  DetalleVenta,
  EntradaMercaderia,
  BajaInventario,
  SolicitudReposicion,
  LogAcceso,
  Configuracion,
  Turno,
  MovimientoCaja,
  ConsumoLote,
  AjusteInventario,
};
