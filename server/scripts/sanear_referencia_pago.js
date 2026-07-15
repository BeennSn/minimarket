/**
 * sanear_referencia_pago.js
 * Uso único: limpia ventas.referencia_pago para que el sync({ alter: true })
 * automático pueda angostar la columna a VARCHAR(6) y agregar el índice
 * único (ver server/models/Venta.js) — antes de este cambio el campo era
 * texto libre opcional, así que puede haber valores de más de 6 caracteres
 * o repetidos que hoy bloquean ese ALTER en cada arranque.
 *
 * Pone en NULL (nunca borra la venta ni el registro en sí):
 *   1) cualquier valor que no sean exactamente 6 dígitos.
 *   2) todos menos el más antiguo de cada valor duplicado que sí calce.
 *
 * Debe correrse ANTES de que el servidor vuelva a intentar el sync/alter
 * (o sea, antes del próximo arranque en frío que reciba tráfico real).
 *
 * node server/scripts/sanear_referencia_pago.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize } = require('sequelize');

const sanear = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true'
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
  });

  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    const [, metaFormato] = await sequelize.query(`
      UPDATE ventas
      SET referencia_pago = NULL
      WHERE referencia_pago IS NOT NULL
        AND referencia_pago !~ '^[0-9]{6}$'
    `);
    console.log(`✓ ${metaFormato.rowCount} valor(es) con formato inválido puestos en NULL`);

    const [, metaDuplicados] = await sequelize.query(`
      UPDATE ventas
      SET referencia_pago = NULL
      WHERE referencia_pago IS NOT NULL
        AND id NOT IN (
          SELECT MIN(id) FROM ventas WHERE referencia_pago IS NOT NULL GROUP BY referencia_pago
        )
    `);
    console.log(`✓ ${metaDuplicados.rowCount} valor(es) duplicado(s) puestos en NULL (se conservó el más antiguo de cada uno)`);

    console.log('Listo. El próximo sync({ alter: true }) del servidor ya debería poder angostar la columna.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

sanear();
