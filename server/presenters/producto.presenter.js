/**
 * producto.presenter.js
 * Formatea las respuestas del módulo de productos.
 */

/**
 * Devuelve los campos públicos de un producto con su categoría.
 * @param {object} producto - Instancia Sequelize de Producto
 * @returns {{ id, nombre, marca, precio, stock, activo, categoria: { id, nombre } }}
 */
const presentarProducto = (producto) => ({
  id:     producto.id,
  nombre: producto.nombre,
  marca:  producto.marca,
  precio: producto.precio,
  stock:  producto.stock,
  stock_minimo: producto.stock_minimo ?? null,
  activo: producto.activo,
  maneja_vencimiento: producto.maneja_vencimiento !== false,
  codigo_barras: producto.codigo_barras || null,
  proxima_fecha_vencimiento: producto.proxima_fecha_vencimiento || null,
  stock_vigente: producto.stock_vigente ?? null,
  proveedor: producto.proveedor ? {
    id:     producto.proveedor.id,
    nombre: producto.proveedor.nombre,
    ruc:    producto.proveedor.ruc,
  } : null,
  categoria: producto.categoria ? {
    id:     producto.categoria.id,
    nombre: producto.categoria.nombre,
  } : null,
});

/**
 * Devuelve un array de productos formateados.
 * @param {object[]} productos - Array de instancias Sequelize de Producto
 * @returns {object[]}
 */
const presentarLista = (productos) => productos.map(presentarProducto);

module.exports = { presentarProducto, presentarLista };
