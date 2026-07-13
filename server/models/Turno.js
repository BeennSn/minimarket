const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Turno = sequelize.define('Turno', {
  usuario_id:               { type: DataTypes.INTEGER, allowNull: false },
  monto_apertura:           { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  estado:                   { type: DataTypes.ENUM('Abierto', 'Cerrado'), allowNull: false, defaultValue: 'Abierto' },
  fecha_apertura:           { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_cierre:             { type: DataTypes.DATE, allowNull: true },
  monto_esperado_efectivo:  { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  monto_esperado_yape:      { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  monto_contado_efectivo:   { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  monto_contado_yape:       { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  diferencia_efectivo:      { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  diferencia_yape:          { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  observaciones:            { type: DataTypes.TEXT, allowNull: true },
  aprobado_por:             { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'turnos',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['usuario_id'], where: { estado: 'Abierto' }, name: 'turnos_usuario_abierto_unico' },
  ],
});

module.exports = Turno;
