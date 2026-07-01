/**
 * migrar_motivo_bajas.js
 * Uso único: convierte los valores de texto libre existentes en
 * bajas_inventario.motivo a los nuevos valores del ENUM ('Vencido', 'Dañado',
 * 'Robo o faltante', 'Consumo interno', 'Error de registro', 'Otro'),
 * preservando el texto original en la nueva columna motivo_detalle.
 * Debe correrse ANTES de que el servidor haga sync({ alter: true }) con el
 * nuevo modelo, porque Postgres no puede convertir VARCHAR -> ENUM si hay
 * valores que no calzan con ninguna opción del enum.
 *
 * node server/scripts/migrar_motivo_bajas.js   (desde la raíz del proyecto)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { Sequelize, DataTypes } = require('sequelize');

const MOTIVOS_VALIDOS = ['Vencido', 'Dañado', 'Robo o faltante', 'Consumo interno', 'Error de registro', 'Otro'];

// Mapeo de texto libre conocido -> { motivo del enum, detalle a preservar }
const MAPEO = {
  'Prueba FEFO baja':                        { motivo: 'Otro',    detalle: 'Prueba FEFO baja' },
  'Producto golpeado — rotura de envase':    { motivo: 'Dañado',  detalle: 'Producto golpeado — rotura de envase' },
  'Producto vencido — retirado de anaquel':  { motivo: 'Vencido', detalle: 'Retirado de anaquel' },
  'Daño en empaque durante descarga':        { motivo: 'Dañado',  detalle: 'Daño en empaque durante descarga' },
  'Merma por humedad en almacén':            { motivo: 'Dañado',  detalle: 'Merma por humedad en almacén' },
  'Fecha de vencimiento próxima — donación': { motivo: 'Vencido', detalle: 'Donación por fecha de vencimiento próxima' },
};

const migrar = async () => {
  const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  });

  try {
    await sequelize.authenticate();
    console.log('Conexión exitosa.');

    const queryInterface = sequelize.getQueryInterface();
    const tabla = await queryInterface.describeTable('bajas_inventario');

    if (!tabla.motivo_detalle) {
      await queryInterface.addColumn('bajas_inventario', 'motivo_detalle', {
        type: DataTypes.STRING,
        allowNull: true,
      });
      console.log('✓ Columna motivo_detalle agregada');
    } else {
      console.log('ℹ️  motivo_detalle ya existe');
    }

    const [filas] = await sequelize.query('SELECT DISTINCT motivo FROM bajas_inventario');
    let migradas = 0;

    for (const { motivo } of filas) {
      if (MOTIVOS_VALIDOS.includes(motivo)) continue; // ya calza con el enum, no toca nada

      const mapeo = MAPEO[motivo] || { motivo: 'Otro', detalle: motivo };
      const [, meta] = await sequelize.query(
        'UPDATE bajas_inventario SET motivo = :nuevoMotivo, motivo_detalle = COALESCE(motivo_detalle, :detalle) WHERE motivo = :motivoOriginal',
        { replacements: { nuevoMotivo: mapeo.motivo, detalle: mapeo.detalle, motivoOriginal: motivo } }
      );
      console.log(`✓ "${motivo}" -> motivo="${mapeo.motivo}", motivo_detalle="${mapeo.detalle}" (${meta.rowCount} fila(s))`);
      migradas++;
    }

    console.log(`Migración completada. ${migradas} valor(es) de motivo remapeados.`);
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

migrar();
