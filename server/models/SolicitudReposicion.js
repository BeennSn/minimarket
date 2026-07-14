const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SolicitudReposicion = sequelize.define('SolicitudReposicion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  producto_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'productos',
      key: 'id',
    },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('Pendiente', 'Aprobada', 'Rechazada', 'Completada'),
    defaultValue: 'Pendiente',
  },
  proveedor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'proveedores',
      key: 'id',
    },
  },
  fecha_estimada: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  motivo_rechazo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  usuario_solicitante_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  usuario_aprobador_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  // Si esta solicitud se generó automáticamente porque otra se completó con
  // cantidad parcial (ver inventario.controller.js:completarSolicitud), acá
  // queda la referencia a esa solicitud original — para poder rastrear por
  // qué existe esta segunda solicitud del mismo producto.
  solicitud_origen_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'solicitudes_reposicion',
      key: 'id',
    },
  },
}, {
  tableName: 'solicitudes_reposicion',
  timestamps: true,
});

module.exports = SolicitudReposicion;
