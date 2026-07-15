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
  // null: el cierre lo hizo el propio cajero (flujo normal). Con valor: fue
  // un cierre forzado por un Administrador/Gerente porque el cajero no
  // cerró su turno — motivo_cierre_forzado es obligatorio en ese caso
  // (validado en el controller, no acá).
  cerrado_por:              { type: DataTypes.INTEGER, allowNull: true },
  motivo_cierre_forzado:    { type: DataTypes.STRING(255), allowNull: true },
}, {
  tableName: 'turnos',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['usuario_id'], where: { estado: 'Abierto' }, name: 'turnos_usuario_abierto_unico' },
  ],
});

module.exports = Turno;
