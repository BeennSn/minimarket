/**
 * auth.presenter.js
 * Formatea las respuestas del módulo de autenticación.
 */

/**
 * Devuelve solo los campos públicos de un usuario.
 * @param {object} usuario - Instancia Sequelize de Usuario
 * @returns {{ id, nombre, email, rol }}
 */
const presentarUsuario = (usuario) => ({
  id:     usuario.id,
  nombre: usuario.nombre,
  email:  usuario.email,
  rol:    usuario.rol,
});

/**
 * Devuelve la respuesta completa de login: token + usuario formateado.
 * @param {string} token   - JWT generado
 * @param {object} usuario - Instancia Sequelize de Usuario
 * @returns {{ token, usuario }}
 */
const presentarLogin = (token, usuario) => ({
  token,
  usuario: presentarUsuario(usuario),
});

module.exports = { presentarUsuario, presentarLogin };
