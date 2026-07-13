/**
 * agregar_tipo_logs_acceso.js
 * Uso único: agrega la columna `tipo` (ENUM Login/Logout/Otro) a logs_acceso.
 * Necesario porque sequelize.sync({ alter: true }) no agrega de forma
 * confiable columnas ENUM nuevas en Postgres — hay que crearla a mano.
 *
 * node server/scripts/agregar_tipo_logs_acceso.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize } = require('sequelize');

const migrar = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  });

  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_logs_acceso_tipo" AS ENUM ('Login', 'Logout', 'Otro');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✓ Tipo enum_logs_acceso_tipo listo');

    await sequelize.query(`
      ALTER TABLE logs_acceso
      ADD COLUMN IF NOT EXISTS tipo "enum_logs_acceso_tipo" NOT NULL DEFAULT 'Login';
    `);
    console.log('✓ Columna tipo agregada a logs_acceso');
  } catch (err) {
    console.error('Error en migración:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

migrar();
