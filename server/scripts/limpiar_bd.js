require('dotenv').config();
const { Sequelize } = require('sequelize');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  logging: false,
});

const TABLAS_EN_ORDEN = [
  'detalle_ventas',
  'ventas',
  'entradas_mercaderia',
  'bajas_inventario',
  'solicitudes_reposicion',
  'logs_acceso',
  'productos',
  'categorias',
  'proveedores',
  'clientes',
];

async function limpiar() {
  try {
    await seq.authenticate();
    console.log('Conectado a la base de datos\n');

    for (const tabla of TABLAS_EN_ORDEN) {
      await seq.query(`DELETE FROM "${tabla}"`);
      console.log(`  ✓ ${tabla} limpiada`);
    }

    console.log('\nReseteando sequences...');
    for (const tabla of TABLAS_EN_ORDEN) {
      await seq.query(
        `SELECT setval(pg_get_serial_sequence('"${tabla}"', 'id'), COALESCE(MAX(id), 0) + 1, false) FROM "${tabla}"`
      );
    }

    console.log('\nBase de datos limpiada exitosamente (usuarios intactos)');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await seq.close();
  }
}

limpiar();
