require('dotenv').config();
const { sequelize } = require('../models');

const migrar = async () => {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    const query = sequelize.getQueryInterface();

    // Agregar columnas faltantes a la tabla "usuarios"
    const tablas = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' AND column_name='reset_used'"
    );
    if (tablas[0].length === 0) {
      await query.addColumn('usuarios', 'reset_used', {
        type: require('sequelize').DataTypes.BOOLEAN,
        defaultValue: false,
      });
      console.log('✓ Columna reset_used agregada');
    } else {
      console.log('ℹ️  reset_used ya existe');
    }

    const colIntentos = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' AND column_name='intentos_fallidos'"
    );
    if (colIntentos[0].length === 0) {
      await query.addColumn('usuarios', 'intentos_fallidos', {
        type: require('sequelize').DataTypes.INTEGER,
        defaultValue: 0,
      });
      console.log('✓ Columna intentos_fallidos agregada');
    } else {
      console.log('ℹ️  intentos_fallidos ya existe');
    }

    const colBloqueo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='usuarios' AND column_name='bloqueo_hasta'"
    );
    if (colBloqueo[0].length === 0) {
      await query.addColumn('usuarios', 'bloqueo_hasta', {
        type: require('sequelize').DataTypes.DATE,
        allowNull: true,
      });
      console.log('✓ Columna bloqueo_hasta agregada');
    } else {
      console.log('ℹ️  bloqueo_hasta ya existe');
    }

    // Agregar columna "detalle" a "logs_acceso"
    const colDetalle = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='logs_acceso' AND column_name='detalle'"
    );
    if (colDetalle[0].length === 0) {
      await query.addColumn('logs_acceso', 'detalle', {
        type: require('sequelize').DataTypes.STRING,
        allowNull: true,
      });
      console.log('✓ Columna detalle agregada a logs_acceso');
    } else {
      console.log('ℹ️  detalle en logs_acceso ya existe');
    }

    console.log('Migración completada.');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
};

migrar();
