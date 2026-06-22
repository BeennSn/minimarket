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

// ─── Asociaciones ─────────────────────────────────────────────────────────────

// Producto → Categoria
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });
Categoria.hasMany(Producto,   { foreignKey: 'categoria_id', as: 'productos' });

// Venta → Usuario
Venta.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(Venta,   { foreignKey: 'usuario_id', as: 'ventas' });

// Venta → Cliente
Venta.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
Cliente.hasMany(Venta,   { foreignKey: 'cliente_id', as: 'ventas' });

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

// BajaInventario → Producto
BajaInventario.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });
Producto.hasMany(BajaInventario,   { foreignKey: 'producto_id', as: 'bajas' });

// BajaInventario → Usuario
BajaInventario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(BajaInventario,   { foreignKey: 'usuario_id', as: 'bajas' });

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

// LogAcceso → Usuario
LogAcceso.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
Usuario.hasMany(LogAcceso,   { foreignKey: 'usuario_id', as: 'logs' });

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
};
