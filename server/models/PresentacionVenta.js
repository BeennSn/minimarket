const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PresentacionVenta = sequelize.define('PresentacionVenta', {
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
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'El nombre de la presentación no puede estar vacío' },
    },
  },
  // Cuántas unidades base equivale 1 unidad de esta presentación (ej. la
  // presentación "Docena" de un producto cuya unidad base es "huevo" tiene
  // factor_conversion = 12). La presentación default siempre tiene factor 1,
  // para que Producto.stock/precio sigan sin ambigüedad.
  factor_conversion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: { args: [1], msg: 'El factor de conversión debe ser al menos 1' },
    },
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0.01,
    },
  },
  // Exactamente una presentación por producto debe tener es_default = true
  // (con factor_conversion = 1): es la que se refleja en Producto.precio y
  // la que se usa cuando el vendedor no elige presentación explícita.
  es_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'presentaciones_venta',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['producto_id', 'nombre'] },
  ],
});

module.exports = PresentacionVenta;
