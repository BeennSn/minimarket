const presentarEntrada = (entrada) => ({
  id: entrada.id,
  producto: {
    id:     entrada.producto.id,
    nombre: entrada.producto.nombre,
    marca:  entrada.producto.marca,
  },
  proveedor: entrada.proveedor
    ? { id: entrada.proveedor.id, nombre: entrada.proveedor.nombre }
    : null,
  cantidad: entrada.cantidad,
  cantidad_restante: entrada.cantidad_restante,
  usuario: {
    id:     entrada.usuario.id,
    nombre: entrada.usuario.nombre,
  },
  solicitud_id: entrada.solicitud_id || null,
  solicitud: entrada.solicitud
    ? { id: entrada.solicitud.id }
    : null,
  ajuste_id: entrada.ajuste_id || null,
  codigo_lote: entrada.codigo_lote || null,
  fecha_vencimiento: entrada.fecha_vencimiento || null,
  costo_unitario: entrada.costo_unitario ?? null,
  cantidad_unidad_compra: entrada.cantidad_unidad_compra ?? null,
  unidad_compra_snapshot: entrada.unidad_compra_snapshot ?? null,
  createdAt: entrada.createdAt,
});

const presentarBaja = (baja) => ({
  id: baja.id,
  producto: {
    id:     baja.producto.id,
    nombre: baja.producto.nombre,
    marca:  baja.producto.marca,
  },
  cantidad: baja.cantidad,
  motivo:   baja.motivo,
  motivo_detalle: baja.motivo_detalle ?? null,
  usuario: {
    id:     baja.usuario.id,
    nombre: baja.usuario.nombre,
  },
  // Lote(s) exactos de los que salió esta baja (vía ConsumoLote). Con baja
  // por lote específico será uno solo; con la automática (FEFO) puede haber
  // más de uno si la cantidad cruzó de un lote a otro.
  lotes: (baja.consumos || []).map((c) => ({
    id: c.lote?.id ?? null,
    codigo_lote: c.lote?.codigo_lote || null,
    fecha_vencimiento: c.lote?.fecha_vencimiento || null,
    cantidad: c.cantidad,
  })),
  createdAt: baja.createdAt,
});

const presentarSolicitud = (solicitud) => ({
  id: solicitud.id,
  producto: {
    id:     solicitud.producto.id,
    nombre: solicitud.producto.nombre,
    marca:  solicitud.producto.marca,
    maneja_vencimiento: solicitud.producto.maneja_vencimiento !== false,
  },
  cantidad:   solicitud.cantidad,
  estado:     solicitud.estado,
  proveedor:  solicitud.proveedor
    ? { id: solicitud.proveedor.id, nombre: solicitud.proveedor.nombre }
    : null,
  fecha_estimada: solicitud.fecha_estimada,
  motivo_rechazo: solicitud.motivo_rechazo,
  solicitante: {
    id:     solicitud.solicitante.id,
    nombre: solicitud.solicitante.nombre,
  },
  aprobador: solicitud.aprobador
    ? { id: solicitud.aprobador.id, nombre: solicitud.aprobador.nombre }
    : null,
  createdAt: solicitud.createdAt,
});

const presentarAjuste = (ajuste) => ({
  id: ajuste.id,
  producto: {
    id:     ajuste.producto.id,
    nombre: ajuste.producto.nombre,
    marca:  ajuste.producto.marca,
  },
  cantidad_sistema: ajuste.cantidad_sistema,
  cantidad_contada: ajuste.cantidad_contada,
  diferencia:       ajuste.diferencia,
  observaciones:    ajuste.observaciones ?? null,
  usuario: {
    id:     ajuste.usuario.id,
    nombre: ajuste.usuario.nombre,
  },
  createdAt: ajuste.createdAt,
});

module.exports = { presentarEntrada, presentarBaja, presentarSolicitud, presentarAjuste };
