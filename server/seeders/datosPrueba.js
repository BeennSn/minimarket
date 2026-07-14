/**
 * datosPrueba.js
 * Crea los usuarios de prueba adicionales (Vendedor, Almacenero, Gerente) que
 * requiere scripts/sembrar_datos.js — adminSeed.js solo crea el Administrador.
 * Ejecución: node seeders/datosPrueba.js
 *
 * Nota: este script antes también creaba productos con stock y ventas de
 * ejemplo directamente por Sequelize, sin pasar por el sistema de lotes
 * (EntradaMercaderia / consumirStockFIFO). Eso dejaba productos con
 * Producto.stock > 0 sin ningún lote real detrás, rompiendo el invariante
 * stock === suma(cantidad_restante) y sin fecha de vencimiento asociada. Esa
 * parte se eliminó: scripts/sembrar_datos.js ya crea productos, ventas y
 * lotes de forma consistente con el resto del sistema.
 */

const bcrypt = require('bcryptjs');
const { sequelize, Usuario } = require('../models');

// ────────────────────────────────────────────────────────────────────────────
// Datos a insertar
// ────────────────────────────────────────────────────────────────────────────

const USUARIOS_ADICIONALES = [
  {
    nombre: 'Juan Pérez',
    email: 'vendedor@minimarket.com',
    password: 'Vendedor123*',
    rol: 'Vendedor',
  },
  {
    nombre: 'María López',
    email: 'almacenero@minimarket.com',
    password: 'Almacen123*',
    rol: 'Almacenero',
  },
  {
    nombre: 'Carlos Ríos',
    email: 'gerente@minimarket.com',
    password: 'Gerente123*',
    rol: 'Gerente',
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Funciones principales
// ────────────────────────────────────────────────────────────────────────────

/**
 * Crea usuarios adicionales
 */
const crearUsuariosAdicionales = async () => {
  let created = 0;
  for (const userData of USUARIOS_ADICIONALES) {
    try {
      const existe = await Usuario.findOne({ where: { email: userData.email } });
      if (!existe) {
        const password_hash = await bcrypt.hash(userData.password, 10);
        await Usuario.create({
          nombre: userData.nombre,
          email: userData.email,
          password_hash,
          rol: userData.rol,
          activo: true,
        });
        created++;
      }
    } catch (err) {
      console.error(`Error al crear usuario "${userData.email}":`, err.message);
    }
  }
  return created;
};

// ────────────────────────────────────────────────────────────────────────────
// Función principal
// ────────────────────────────────────────────────────────────────────────────

const main = async () => {
  try {
    console.log('\n🔄 Iniciando carga de usuarios de prueba...\n');

    // Sincronizar modelos
    await sequelize.sync({ alter: true });

    const usuariosCreados = await crearUsuariosAdicionales();
    console.log(`✅ Usuarios creados: ${usuariosCreados}`);

    console.log('\n🎉 Usuarios de prueba cargados correctamente\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al cargar usuarios de prueba:', err);
    process.exit(1);
  }
};

// Ejecutar
main();
