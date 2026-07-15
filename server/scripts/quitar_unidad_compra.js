/**
 * quitar_unidad_compra.js
 * Uso único: elimina las columnas de "unidad de compra" (Caja/Paquete/Docena
 * + factor de conversión) que ya no existen en los modelos Producto y
 * EntradaMercaderia — el sistema pasó a registrar toda entrada de mercadería
 * siempre en unidades. `sync({ alter: true })` no borra columnas que salen
 * del modelo, solo agrega/ajusta, así que hace falta este script puntual.
 *
 * node server/scripts/quitar_unidad_compra.js   (desde la raíz del proyecto)
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

    const tablaProductos = await queryInterface.describeTable('productos');
    if (tablaProductos.unidad_compra) {
      await queryInterface.removeColumn('productos', 'unidad_compra');
      console.log('✓ productos.unidad_compra eliminada');
    } else {
      console.log('ℹ️  productos.unidad_compra ya no existe');
    }
    if (tablaProductos.factor_conversion) {
      await queryInterface.removeColumn('productos', 'factor_conversion');
      console.log('✓ productos.factor_conversion eliminada');
    } else {
      console.log('ℹ️  productos.factor_conversion ya no existe');
    }

    const tablaEntradas = await queryInterface.describeTable('entradas_mercaderia');
    if (tablaEntradas.cantidad_unidad_compra) {
      await queryInterface.removeColumn('entradas_mercaderia', 'cantidad_unidad_compra');
      console.log('✓ entradas_mercaderia.cantidad_unidad_compra eliminada');
    } else {
      console.log('ℹ️  entradas_mercaderia.cantidad_unidad_compra ya no existe');
    }
    if (tablaEntradas.unidad_compra_snapshot) {
      await queryInterface.removeColumn('entradas_mercaderia', 'unidad_compra_snapshot');
      console.log('✓ entradas_mercaderia.unidad_compra_snapshot eliminada');
    } else {
      console.log('ℹ️  entradas_mercaderia.unidad_compra_snapshot ya no existe');
    }

    // Postgres no borra solo los tipos ENUM que Sequelize crea para cada
    // columna; si quedan huérfanos no rompen nada pero conviene limpiarlos.
    await sequelize.query('DROP TYPE IF EXISTS "enum_productos_unidad_compra"');
    await sequelize.query('DROP TYPE IF EXISTS "enum_entradas_mercaderia_unidad_compra_snapshot"');
    console.log('✓ Tipos ENUM huérfanos eliminados (si existían)');

    console.log('Migración completada.');
  } catch (err) {
    console.error('Error en migración:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

migrar();
