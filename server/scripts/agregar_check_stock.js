/**
 * agregar_check_stock.js
 * Uso único: agrega un CHECK constraint a nivel de Postgres para impedir que
 * productos.stock quede negativo, como defensa en profundidad además de la
 * validación de Sequelize (`validate: { min: 0 }`), que solo corre en la capa
 * de aplicación y no protege contra queries SQL directas u otros caminos que
 * no pasen por consumirStockFIFO/crearLote.
 *
 * node server/scripts/agregar_check_stock.js   (desde la raíz del proyecto)
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
      ALTER TABLE productos
      ADD CONSTRAINT stock_no_negativo CHECK (stock >= 0)
    `);
    console.log('✓ CHECK stock_no_negativo agregado');
  } catch (err) {
    if (err.original?.code === '42710') {
      console.log('ℹ️  El constraint ya existe, no se hace nada.');
    } else {
      console.error('Error en migración:', err);
      process.exitCode = 1;
    }
  } finally {
    await sequelize.close();
  }
};

migrar();
