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
  costo_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  cantidad_unidad_compra: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  unidad_compra_snapshot: {
    type: DataTypes.ENUM('Unidad', 'Caja', 'Paquete', 'Docena', 'Otro'),
    allowNull: true,
  },
}, {
  tableName: 'entradas_mercaderia',
  timestamps: true,
});

module.exports = EntradaMercaderia;
