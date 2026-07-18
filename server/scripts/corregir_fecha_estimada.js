/**
 * corregir_fecha_estimada.js
 * Uso único: convierte solicitudes_reposicion.fecha_estimada de TIMESTAMP a
 * DATE. Con TIMESTAMP, un 'YYYY-MM-DD' enviado desde el formulario se
 * guardaba como medianoche UTC, y el navegador en Perú (UTC-5) lo mostraba
 * retrocedido un día (18/07 aparecía como 17/07). Idempotente: si la columna
 * ya es DATE, no hace nada.
 *
 * node server/scripts/corregir_fecha_estimada.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize } = require('sequelize');

const corregir = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  });

  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    const [[columna]] = await sequelize.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'solicitudes_reposicion' AND column_name = 'fecha_estimada'
    `);

    if (columna?.data_type === 'date') {
      console.log('ℹ️  fecha_estimada ya es DATE, no se necesita migrar.');
    } else {
      await sequelize.query(`
        ALTER TABLE solicitudes_reposicion
        ALTER COLUMN fecha_estimada TYPE DATE
      `);
      console.log('✓ fecha_estimada convertida a DATE');
    }
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

corregir();
