/**
 * adminSeed.js
 * Inserta el usuario administrador inicial si no existe ninguno con rol Administrador.
 * Se ejecuta automáticamente desde app.js tras la sincronización de tablas.
 */

const bcrypt  = require('bcryptjs');
const { Usuario } = require('../models');

const seedAdmin = async () => {
  try {
    // Verificar si ya existe algún administrador
    const adminExistente = await Usuario.findOne({ where: { rol: 'Administrador' } });

    if (adminExistente) {
      console.log('ℹ️  Ya existe un administrador');
      return;
    }

    // Hashear la contraseña antes de insertar
    const password_hash = await bcrypt.hash('Admin123*', 10);

    await Usuario.create({
      nombre:        'Admin Principal',
      email:         'admin@minimarket.com',
      password_hash,
      rol:           'Administrador',
      activo:        true,
    });

    console.log('✅ Usuario administrador creado');
  } catch (err) {
    console.error('❌ Error al ejecutar el seed de administrador:', err);
  }
};

module.exports = seedAdmin;
