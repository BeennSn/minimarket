/**
 * usuario.presenter.js
 * Formatea las respuestas del módulo de usuarios.
 */

/**
 * Devuelve los campos públicos de un usuario.
 * @param {object} usuario - Instancia Sequelize de Usuario
 * @returns {{ id, nombre, email, rol, activo }}
 */
const presentarUsuario = (usuario) => ({
  id:     usuario.id,
  nombre: usuario.nombre,
  email:  usuario.email,
  rol:    usuario.rol,
  activo: usuario.activo,
});

/**
 * Devuelve un array de usuarios formateados.
 * @param {object[]} usuarios - Array de instancias Sequelize de Usuario
 * @returns {object[]}
 */
const presentarLista = (usuarios) => usuarios.map(presentarUsuario);

module.exports = { presentarUsuario, presentarLista };
