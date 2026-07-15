/**
 * backfill_presentaciones_venta.js
 * Uso único: crea la presentación de venta default ("Unidad", factor 1,
 * precio = productos.precio) para todo producto que todavía no tenga
 * ninguna fila en presentaciones_venta, y backfillea los DetalleVenta
 * históricos con esa presentación para que los comprobantes reimpresos
 * muestren una etiqueta en vez de campos vacíos.
 *
 * Debe correrse DESPUÉS de que el servidor haya hecho sync({ alter: true })
 * al menos una vez con el nuevo modelo PresentacionVenta (para que la tabla
 * presentaciones_venta ya exista). Es idempotente: se puede correr varias
 * veces sin duplicar filas.
 *
 * node server/scripts/backfill_presentaciones_venta.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize } = require('sequelize');

const backfill = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    const [insertadas] = await sequelize.query(`
      INSERT INTO presentaciones_venta (producto_id, nombre, factor_conversion, precio, es_default, activo, "createdAt", "updatedAt")
      SELECT p.id, 'Unidad', 1, p.precio, true, true, NOW(), NOW()
      FROM productos p
      WHERE NOT EXISTS (SELECT 1 FROM presentaciones_venta pv WHERE pv.producto_id = p.id)
      RETURNING producto_id
    `);
    console.log(`✓ ${insertadas.length} producto(s) recibieron su presentación default "Unidad"`);

    const [, metaDetalles] = await sequelize.query(`
      UPDATE detalle_ventas dv
      SET presentacion_venta_id = pv.id,
          cantidad_presentacion = dv.cantidad,
          presentacion_nombre_snapshot = 'Unidad',
          presentacion_factor_snapshot = 1
      FROM presentaciones_venta pv
      WHERE pv.producto_id = dv.producto_id
        AND pv.es_default = true
        AND dv.presentacion_venta_id IS NULL
    `);
    console.log(`✓ ${metaDetalles.rowCount} detalle(s) de venta histórico(s) backfilleados con la presentación "Unidad"`);

    console.log('Backfill completado.');
    process.exit(0);
  } catch (err) {
    console.error('Error en backfill:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

backfill();
