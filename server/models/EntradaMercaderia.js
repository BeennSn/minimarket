const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EntradaMercaderia = sequelize.define('EntradaMercaderia', {
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
  proveedor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'proveedores',
      key: 'id',
    },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  solicitud_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'solicitudes_reposicion',
      key: 'id',
    },
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'entradas_mercaderia',
  timestamps: true,
});

module.exports = EntradaMercaderia;
