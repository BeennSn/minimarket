const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DetalleVenta = sequelize.define('DetalleVenta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  venta_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'ventas',
      key: 'id',
    },
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id',
    },
  },
  // Siempre en unidades base del producto (post-conversión), igual que
  // EntradaMercaderia.cantidad — es lo único que usan consumirStockFIFO,
  // revertirConsumo y los reportes. No confundir con cantidad_presentacion.
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Precio de 1 unidad de la presentación elegida (no de 1 unidad base).
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  presentacion_venta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'presentaciones_venta',
      key: 'id',
    },
  },
  // Cuántas unidades de la presentación eligió el cajero (ej. 2 "Docena").
  cantidad_presentacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Snapshot de la presentación al momento de la venta: sobrevive si luego
  // se renombra/desactiva, igual que EntradaMercaderia.unidad_compra_snapshot.
  presentacion_nombre_snapshot: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  presentacion_factor_snapshot: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
  },
}, {
  tableName: 'detalle_ventas',
  timestamps: true,
});

module.exports = DetalleVenta;
