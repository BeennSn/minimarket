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
    validate: {
      notEmpty: { msg: 'El nombre no puede estar vacío' },
    },
  },
  marca: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'La marca no puede estar vacía' },
    },
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
    validate: {
      min: { args: [0], msg: 'El stock no puede ser negativo' },
    },
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
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // false para productos que no caducan (Encendedor, Cepillos, etc.): sus entradas
  // de inventario no piden fecha de vencimiento. true por defecto para no
  // cambiar el comportamiento de los productos ya existentes.
  maneja_vencimiento: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  costo_promedio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  stock_minimo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: { args: [0], msg: 'El stock mínimo no puede ser negativo' },
    },
  },
}, {
  tableName: 'productos',
  timestamps: true,
});

module.exports = Producto;
