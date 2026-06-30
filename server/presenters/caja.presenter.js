const presentarMovimiento = (mov) => ({
  id:          mov.id,
  tipo:        mov.tipo,
  descripcion: mov.descripcion,
  metodo:      mov.metodo,
  monto:       parseFloat(mov.monto),
  venta_id:    mov.venta_id,
  createdAt:   mov.createdAt,
  usuario:     mov.usuario ? { id: mov.usuario.id, nombre: mov.usuario.nombre } : null,
});

const presentarTurno = (turno) => ({
  id:                      turno.id,
  estado:                  turno.estado,
  monto_apertura:          parseFloat(turno.monto_apertura),
  fecha_apertura:          turno.fecha_apertura,
  fecha_cierre:            turno.fecha_cierre,
  monto_esperado_efectivo: turno.monto_esperado_efectivo !== null ? parseFloat(turno.monto_esperado_efectivo) : null,
  monto_esperado_yape:     turno.monto_esperado_yape !== null ? parseFloat(turno.monto_esperado_yape) : null,
  monto_contado_efectivo:  turno.monto_contado_efectivo !== null ? parseFloat(turno.monto_contado_efectivo) : null,
  monto_contado_yape:      turno.monto_contado_yape !== null ? parseFloat(turno.monto_contado_yape) : null,
  diferencia_efectivo:     turno.diferencia_efectivo !== null ? parseFloat(turno.diferencia_efectivo) : null,
  diferencia_yape:         turno.diferencia_yape !== null ? parseFloat(turno.diferencia_yape) : null,
  observaciones:           turno.observaciones,
  cajero:                  turno.cajero ? { id: turno.cajero.id, nombre: turno.cajero.nombre } : null,
  aprobador:               turno.aprobador ? { id: turno.aprobador.id, nombre: turno.aprobador.nombre } : null,
  movimientos:             turno.movimientos ? turno.movimientos.map(presentarMovimiento) : undefined,
});

module.exports = { presentarTurno, presentarMovimiento };
