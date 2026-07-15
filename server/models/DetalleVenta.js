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
  // Siempre en unidades base del producto — es lo único que usan
  // consumirStockFIFO, revertirConsumo y los reportes.
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
}, {
  tableName: 'detalle_ventas',
  timestamps: true,
});

module.exports = DetalleVenta;
