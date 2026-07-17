/**
 * limpiar_bd.js
 * Elimina todos los datos excepto usuarios y resetea los auto-incrementos.
 * Uso: node server/scripts/limpiar_bd.js   (desde la raíz del proyecto)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { sequelize } = require('../models');

// Se limpia con TRUNCATE ... CASCADE en una sola sentencia: evita tener que
// mantener a mano el orden exacto que exigen las FK (DELETE sí lo exige, y a
// esta lista ya se le había quedado afuera 'ajustes_inventario' una vez).
const TABLAS = [
  'consumos_lote',
  'movimientos_caja',
  'detalle_ventas',
  'ventas',
  'entradas_mercaderia',
  'bajas_inventario',
  'ajustes_inventario',
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

    await sequelize.query(
      `TRUNCATE TABLE ${TABLAS.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`
    );
    for (const tabla of TABLAS) {
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
