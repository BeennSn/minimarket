/**
 * categoria.presenter.js
 * Formatea las respuestas del módulo de categorías.
 */

/**
 * Devuelve los campos públicos de una categoría.
 * @param {object} categoria - Instancia Sequelize de Categoria
 * @returns {{ id, nombre }}
 */
const presentarCategoria = (categoria) => ({
  id:     categoria.id,
  nombre: categoria.nombre,
});

/**
 * Devuelve un array de categorías formateadas.
 * @param {object[]} categorias - Array de instancias Sequelize de Categoria
 * @returns {object[]}
 */
const presentarLista = (categorias) => categorias.map(presentarCategoria);

module.exports = { presentarCategoria, presentarLista };
