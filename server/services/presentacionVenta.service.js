const { PresentacionVenta } = require('../models');

// Resuelve y valida una presentación de venta para un item de carrito: debe
// existir, estar activa y pertenecer al producto indicado (si no, alguien
// podría mandar la presentación de otro producto — ej. una "Docena" barata
// de otro artículo — para pagar de menos).
const obtenerPresentacionValida = async ({ producto_id, presentacion_venta_id, transaction }) => {
  const presentacion = await PresentacionVenta.findByPk(presentacion_venta_id, { transaction });
  if (!presentacion || !presentacion.activo) {
    throw { status: 404, mensaje: 'Presentación de venta no encontrada o inactiva' };
  }
  if (presentacion.producto_id !== Number(producto_id)) {
    throw { status: 400, mensaje: 'La presentación de venta no corresponde a este producto' };
  }
  return presentacion;
};

// Resuelve la presentación default (es_default=true) de un producto. Se usa
// como respaldo cuando una venta llega sin presentacion_venta_id explícito
// (clientes antiguos en caché, u otros consumidores de la API), tratando la
// cantidad como si ya viniera en unidades base — comportamiento previo a
// esta funcionalidad.
const obtenerPresentacionDefault = async (producto_id, transaction) => {
  const presentacion = await PresentacionVenta.findOne({
    where: { producto_id, es_default: true },
    transaction,
  });
  if (!presentacion) {
    throw { status: 400, mensaje: 'El producto no tiene una presentación de venta configurada' };
  }
  return presentacion;
};

// Mantiene Producto.precio como espejo del precio de su presentación
// default, para que todo lo que ya lee producto.precio directamente (tabla
// de Productos, reportes, etc.) siga funcionando sin cambios.
const sincronizarPrecioProducto = async (producto, transaction) => {
  const presentacionDefault = await PresentacionVenta.findOne({
    where: { producto_id: producto.id, es_default: true },
    transaction,
  });
  if (presentacionDefault && Number(producto.precio) !== Number(presentacionDefault.precio)) {
    producto.precio = presentacionDefault.precio;
    await producto.save({ transaction });
  }
};

module.exports = { obtenerPresentacionValida, obtenerPresentacionDefault, sincronizarPrecioProducto };
