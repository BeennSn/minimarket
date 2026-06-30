/**
 * limpiar_bd.js
 * Elimina todos los datos excepto usuarios y resetea los auto-incrementos.
 * Uso: node server/scripts/limpiar_bd.js   (desde la raíz del proyecto)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { sequelize } = require('../models');

// Orden: hijos antes que padres (respeta FK constraints)
const TABLAS = [
  'consumos_lote',
  'movimientos_caja',
  'detalle_ventas',
  'ventas',
  'entradas_mercaderia',
  'bajas_inventario',
  'turnos',
  'solicitudes_reposicion',
  'logs_acceso',
  'clientes',
  'productos',
  'categorias',
  'proveedores',
];

async function limpiar() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    for (const tabla of TABLAS) {
      await sequelize.query(`DELETE FROM "${tabla}"`);
      await sequelize.query(
        `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), 1, false)`
      );
      console.log(`  ✓ ${tabla}`);
    }

    console.log('\n🎉 Base de datos limpiada. Usuarios y sus contraseñas intactos.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

limpiar();
