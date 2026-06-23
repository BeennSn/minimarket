const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Venta = sequelize.define('Venta', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clientes',
      key: 'id',
    },
  },
  metodo_pago: {
    type: DataTypes.ENUM('Efectivo', 'Yape', 'Plin'),
    allowNull: false,
  },
  monto_total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  monto_recibido: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  vuelto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  tipo_comprobante: {
    type: DataTypes.ENUM('Boleta', 'Factura'),
    defaultValue: 'Boleta',
  },
  cliente_dni: {
    type: DataTypes.STRING(8),
    allowNull: true,
  },
  cliente_ruc: {
    type: DataTypes.STRING(11),
    allowNull: true,
  },
  cliente_razon_social: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cliente_direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'ventas',
  timestamps: true,
});

module.exports = Venta;
