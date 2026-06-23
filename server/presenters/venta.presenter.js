const presentarDetalle = (detalle) => ({
  id: detalle.id,
  producto: {
    id:     detalle.producto.id,
    nombre: detalle.producto.nombre,
    marca:  detalle.producto.marca,
  },
  cantidad:        detalle.cantidad,
  precio_unitario: detalle.precio_unitario,
  subtotal:        detalle.subtotal,
});

const presentarVenta = (venta) => ({
  id: venta.id,
  usuario: {
    id:     venta.usuario.id,
    nombre: venta.usuario.nombre,
  },
  cliente: venta.cliente
    ? { id: venta.cliente.id, nombre: venta.cliente.nombre, dni: venta.cliente.dni }
    : null,
  metodo_pago:       venta.metodo_pago,
  monto_total:       venta.monto_total,
  monto_recibido:    venta.monto_recibido,
  vuelto:            venta.vuelto,
  tipo_comprobante:  venta.tipo_comprobante,
  cliente_dni:       venta.cliente_dni || null,
  cliente_ruc:       venta.cliente_ruc || null,
  cliente_razon_social: venta.cliente_razon_social || null,
  cliente_direccion: venta.cliente_direccion || null,
  createdAt:         venta.createdAt,
  detalles:          venta.detalles.map(presentarDetalle),
});

const presentarLista = (ventas) => ventas.map(presentarVenta);

module.exports = { presentarDetalle, presentarVenta, presentarLista };
