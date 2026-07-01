const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ConsumoLote = sequelize.define('ConsumoLote', {
  entrada_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'entradas_mercaderia',
      key: 'id',
    },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('Venta', 'Baja', 'Ajuste'),
    allowNull: false,
  },
  detalle_venta_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'detalle_ventas',
      key: 'id',
    },
  },
  baja_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'bajas_inventario',
      key: 'id',
    },
  },
  ajuste_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ajustes_inventario',
      key: 'id',
    },
  },
}, {
  tableName: 'consumos_lote',
  timestamps: true,
  updatedAt: false,
});

module.exports = ConsumoLote;
