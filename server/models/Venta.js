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
  // Turno de caja bajo el cual se registró la venta. Se permite NULL a nivel de
  // columna únicamente para que el ALTER TABLE no falle sobre ventas históricas
  // ya existentes; para ventas nuevas el controller siempre lo exige y lo
  // completa (ver venta.controller.js).
  turno_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'turnos',
      key: 'id',
    },
  },
  metodo_pago: {
    type: DataTypes.ENUM('Efectivo', 'Yape'),
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
  monto_yape: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  monto_efectivo: {
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
  yape_verificado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  yape_verificado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  yape_verificado_en: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  referencia_pago: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  estado: {
    type: DataTypes.ENUM('Completada', 'Anulada'),
    allowNull: false,
    defaultValue: 'Completada',
  },
  motivo_anulacion: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  anulado_por: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  anulado_en: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'ventas',
  timestamps: true,
});

module.exports = Venta;
