const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const EntradaMercaderia = sequelize.define('EntradaMercaderia', {
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
  proveedor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'proveedores',
      key: 'id',
    },
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  cantidad_restante: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  usuario_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  solicitud_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'solicitudes_reposicion',
      key: 'id',
    },
  },
  ajuste_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'ajustes_inventario',
      key: 'id',
    },
  },
  fecha_vencimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  // Identificador libre que pone quien registra la entrada (ej. el código de
  // lote del proveedor, o uno interno tipo "L-2026-07-A") para distinguir
  // lotes a simple vista además de por fecha de vencimiento. Opcional.
  codigo_lote: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  costo_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
}, {
  tableName: 'entradas_mercaderia',
  timestamps: true,
});

module.exports = EntradaMercaderia;
