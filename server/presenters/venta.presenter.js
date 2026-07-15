const presentarDetalle = (detalle) => ({
  id: detalle.id,
  producto: {
    id:            detalle.producto.id,
    nombre:        detalle.producto.nombre,
    marca:         detalle.producto.marca,
    codigo_barras: detalle.producto.codigo_barras,
  },
  cantidad:        detalle.cantidad,
  precio_unitario: detalle.precio_unitario,
  subtotal:        detalle.subtotal,
  presentacion_venta_id:        detalle.presentacion_venta_id || null,
  cantidad_presentacion:        detalle.cantidad_presentacion ?? detalle.cantidad,
  presentacion_nombre_snapshot: detalle.presentacion_nombre_snapshot || 'Unidad',
  presentacion_factor_snapshot: detalle.presentacion_factor_snapshot ?? 1,
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
  turno_id:          venta.turno_id || null,
  metodo_pago:       venta.metodo_pago,
  monto_total:       venta.monto_total,
  monto_recibido:    venta.monto_recibido,
  monto_yape:        venta.monto_yape || null,
  monto_efectivo:    venta.monto_efectivo || null,
  vuelto:            venta.vuelto,
  tipo_comprobante:  venta.tipo_comprobante,
  numero_comprobante: venta.numero_comprobante || null,
  serie_comprobante:  venta.serie_comprobante || null,
  cliente_dni:       venta.cliente_dni || null,
  cliente_ruc:       venta.cliente_ruc || null,
  cliente_razon_social: venta.cliente_razon_social || null,
  cliente_direccion: venta.cliente_direccion || null,
  yape_verificado:     venta.yape_verificado || false,
  yape_verificado_por: venta.yape_verificado_por || null,
  yape_verificado_en:  venta.yape_verificado_en || null,
  referencia_pago:     venta.referencia_pago || null,
  estado:              venta.estado || 'Completada',
  motivo_anulacion:    venta.motivo_anulacion || null,
  anulado_por:         venta.anulador
    ? { id: venta.anulador.id, nombre: venta.anulador.nombre }
    : null,
  anulado_en:          venta.anulado_en || null,
  createdAt:           venta.createdAt,
  detalles:            venta.detalles.map(presentarDetalle),
});

const presentarLista = (ventas) => ventas.map(presentarVenta);

module.exports = { presentarDetalle, presentarVenta, presentarLista };
