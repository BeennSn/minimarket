const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MovimientoCaja = sequelize.define('MovimientoCaja', {
  turno_id:    { type: DataTypes.INTEGER, allowNull: false },
  tipo:        { type: DataTypes.ENUM('Apertura', 'Venta', 'Ingreso', 'Egreso', 'Anulacion'), allowNull: false },
  descripcion: { type: DataTypes.STRING, allowNull: true },
  metodo:      { type: DataTypes.ENUM('Efectivo', 'Yape', 'NA'), allowNull: false, defaultValue: 'NA' },
  monto:       { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  venta_id:    { type: DataTypes.INTEGER, allowNull: true },
  usuario_id:  { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: 'movimientos_caja',
  timestamps: true,
  updatedAt: false,
});

module.exports = MovimientoCaja;
