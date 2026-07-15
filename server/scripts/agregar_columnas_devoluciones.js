/**
 * agregar_columnas_devoluciones.js
 * Uso único: agrega a mano las columnas de la iteración de "cierre forzado
 * de caja" + "devoluciones de venta" que el sync({ alter: true }) automático
 * (server/app.js) no llegó a crear en producción — quedó bloqueado por el
 * ALTER de ventas.referencia_pago (ver sanear_referencia_pago.js). Sin esto,
 * anular una venta sin reponer stock (bajas_inventario.venta_id) y forzar el
 * cierre de un turno (turnos.cerrado_por/motivo_cierre_forzado) fallan con
 * "column ... does not exist". Idempotente: se puede correr varias veces.
 *
 * node server/scripts/agregar_columnas_devoluciones.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize, DataTypes } = require('sequelize');

const agregar = async () => {
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

    const tablaBajas = await queryInterface.describeTable('bajas_inventario');
    if (!tablaBajas.venta_id) {
      await queryInterface.addColumn('bajas_inventario', 'venta_id', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'ventas', key: 'id' },
      });
      console.log('✓ bajas_inventario.venta_id agregada');
    } else {
      console.log('ℹ️  bajas_inventario.venta_id ya existe');
    }

    const tablaTurnos = await queryInterface.describeTable('turnos');
    if (!tablaTurnos.cerrado_por) {
      await queryInterface.addColumn('turnos', 'cerrado_por', {
        type: DataTypes.INTEGER,
        allowNull: true,
      });
      console.log('✓ turnos.cerrado_por agregada');
    } else {
      console.log('ℹ️  turnos.cerrado_por ya existe');
    }
    if (!tablaTurnos.motivo_cierre_forzado) {
      await queryInterface.addColumn('turnos', 'motivo_cierre_forzado', {
        type: DataTypes.STRING(255),
        allowNull: true,
      });
      console.log('✓ turnos.motivo_cierre_forzado agregada');
    } else {
      console.log('ℹ️  turnos.motivo_cierre_forzado ya existe');
    }

    console.log('Listo.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

agregar();
