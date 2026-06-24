const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LogAcceso = sequelize.define('LogAcceso', {
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
  nombre_usuario: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fecha_hora: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  detalle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'logs_acceso',
  timestamps: false,
});

module.exports = LogAcceso;
