const presentarPresentacion = (presentacion) => ({
  id: presentacion.id,
  producto_id: presentacion.producto_id,
  nombre: presentacion.nombre,
  factor_conversion: presentacion.factor_conversion,
  precio: presentacion.precio,
  es_default: presentacion.es_default,
  activo: presentacion.activo,
});

const presentarLista = (presentaciones) => presentaciones.map(presentarPresentacion);

module.exports = { presentarPresentacion, presentarLista };
