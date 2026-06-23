const presentarEntrada = (entrada) => ({
  id: entrada.id,
  producto: {
    id:     entrada.producto.id,
    nombre: entrada.producto.nombre,
    marca:  entrada.producto.marca,
  },
  proveedor: {
    id:     entrada.proveedor.id,
    nombre: entrada.proveedor.nombre,
  },
  cantidad: entrada.cantidad,
  usuario: {
    id:     entrada.usuario.id,
    nombre: entrada.usuario.nombre,
  },
  solicitud_id: entrada.solicitud_id || null,
  solicitud: entrada.solicitud
    ? { id: entrada.solicitud.id }
    : null,
  fecha_vencimiento: entrada.fecha_vencimiento || null,
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
  usuario: {
    id:     baja.usuario.id,
    nombre: baja.usuario.nombre,
  },
  createdAt: baja.createdAt,
});

const presentarSolicitud = (solicitud) => ({
  id: solicitud.id,
  producto: {
    id:     solicitud.producto.id,
    nombre: solicitud.producto.nombre,
    marca:  solicitud.producto.marca,
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

module.exports = { presentarEntrada, presentarBaja, presentarSolicitud };
