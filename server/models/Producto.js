const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Producto = sequelize.define('Producto', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  marca: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoria_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'categorias',
      key: 'id',
    },
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  proveedor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'proveedores',
      key: 'id',
    },
  },
  codigo_barras: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'productos',
  timestamps: true,
});

module.exports = Producto;
