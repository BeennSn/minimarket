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
}, {
  tableName: 'configuracion',
  timestamps: false,
});

module.exports = Configuracion;
