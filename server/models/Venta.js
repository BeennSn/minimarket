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
  // Correlativo real asignado al crear la venta (ver venta.controller.js),
  // junto con la serie vigente en ese momento — se guarda la serie usada
  // (no se recalcula desde Configuracion al mostrarlo) para que un cambio
  // posterior de serie no altere el número ya emitido de una venta pasada.
  // Nulo en ventas anteriores a este cambio (no tienen numeración real);
  // client/src/utils/comprobante.js usa un fallback en ese caso.
  numero_comprobante: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  serie_comprobante: {
    type: DataTypes.STRING(4),
    allowNull: true,
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
  // N° de autorización del pago Yape/Plin en IziPay: siempre 6 dígitos
  // numéricos (validado en el controller), null para ventas en Efectivo.
  referencia_pago: {
    type: DataTypes.STRING(6),
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
