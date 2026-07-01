const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AjusteInventario = sequelize.define('AjusteInventario', {
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
  cantidad_sistema: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cantidad_contada: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: { args: [0], msg: 'La cantidad contada no puede ser negativa' },
    },
  },
  diferencia: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  observaciones: {
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
}, {
  tableName: 'ajustes_inventario',
  timestamps: true,
});

module.exports = AjusteInventario;
