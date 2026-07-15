const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BajaInventario = sequelize.define('BajaInventario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id',
    },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  motivo: {
    type: DataTypes.ENUM('Vencido', 'Dañado', 'Robo o faltante', 'Consumo interno', 'Error de registro', 'Otro'),
    allowNull: false,
  },
  motivo_detalle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  // Si esta baja se generó automáticamente al anular una venta (devolución
  // donde el producto no vuelve a stock vendible), queda la referencia acá.
  // Null para bajas registradas manualmente desde Inventario → Bajas.
  venta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ventas',
      key: 'id',
    },
  },
}, {
  tableName: 'bajas_inventario',
  timestamps: true,
});

module.exports = BajaInventario;
