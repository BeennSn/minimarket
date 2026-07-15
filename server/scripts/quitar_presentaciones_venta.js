/**
 * quitar_presentaciones_venta.js
 * Uso único: elimina el feature de "presentaciones de venta" (vender un
 * producto por Docena/Paquete/etc. con su propio precio y factor de
 * conversión) — el sistema pasó a vender siempre por unidad, al precio único
 * de Producto.precio. `sync({ alter: true })` no borra columnas ni tablas
 * que salen del modelo, solo agrega/ajusta, así que hace falta este script
 * puntual.
 *
 * node server/scripts/quitar_presentaciones_venta.js   (desde la raíz del proyecto)
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

    const queryInterface = sequelize.getQueryInterface();
    const tablaDetalles = await queryInterface.describeTable('detalle_ventas');

    // presentacion_venta_id primero: tiene la FK hacia presentaciones_venta.
    for (const columna of ['presentacion_venta_id', 'cantidad_presentacion', 'presentacion_nombre_snapshot', 'presentacion_factor_snapshot']) {
      if (tablaDetalles[columna]) {
        await queryInterface.removeColumn('detalle_ventas', columna);
        console.log(`✓ detalle_ventas.${columna} eliminada`);
      } else {
        console.log(`ℹ️  detalle_ventas.${columna} ya no existe`);
      }
    }

    await sequelize.query('DROP TABLE IF EXISTS "presentaciones_venta" CASCADE');
    console.log('✓ Tabla presentaciones_venta eliminada (si existía)');

    console.log('Migración completada.');
  } catch (err) {
    console.error('Error en migración:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

migrar();
