const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Configuracion = sequelize.define('Configuracion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    defaultValue: 1,
  },
  nombre_empresa: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'EMPRESA DE PRUEBA',
  },
  ruc: {
    type: DataTypes.STRING(11),
    allowNull: false,
    defaultValue: '99999999999',
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Av. Prueba 000, Ciudad',
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '000-000000',
  },
  igv: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 18,
  },
  serie_boleta: {
    type: DataTypes.STRING(4),
    allowNull: false,
    defaultValue: 'B001',
  },
  serie_factura: {
    type: DataTypes.STRING(4),
    allowNull: false,
    defaultValue: 'F001',
  },
  // Correlativo real por serie: cada venta nueva incrementa el contador de su
  // tipo (Boleta o Factura) dentro de la misma transacción que la crea (ver
  // venta.controller.js). Antes de esto, el número de comprobante era el id
  // autoincremental de Venta, compartido entre ambas series — al intercalarse
  // boletas y facturas quedaban huecos en la numeración de cada una.
  correlativo_boleta: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  correlativo_factura: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  tableName: 'configuracion',
  timestamps: false,
});

module.exports = Configuracion;
