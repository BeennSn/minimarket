const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: { msg: 'El email no es válido' },
    },
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  rol: {
    type: DataTypes.ENUM('Administrador', 'Vendedor', 'Almacenero', 'Gerente', 'SuperAdmin'),
    allowNull: false,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  reset_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  reset_expiry: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  reset_used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  intentos_fallidos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  bloqueo_hasta: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  session_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  motivo_sesion_cerrada: {
    type: DataTypes.ENUM('Cambio de contraseña', 'Cierre forzado por SuperAdmin', 'Nuevo inicio de sesión en otro dispositivo'),
    allowNull: true,
  },
  sesion_activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'usuarios',
  timestamps: true,
});

module.exports = Usuario;
