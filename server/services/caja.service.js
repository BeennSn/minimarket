// Calcula los montos esperados (efectivo/Yape) a partir de los movimientos de
// un turno. Centralizado acá porque lo necesitan dos controllers distintos:
// caja.controller (para el resumen de cierre) y venta.controller (para saber
// si hay efectivo suficiente en caja antes de dar un vuelto) — antes solo
// vivía en caja.controller y venta.controller no tenía forma de consultarlo.
function calcularEsperados(movimientos, montoApertura) {
  let efectivo = parseFloat(montoApertura);
  let yape = 0;

  for (const m of movimientos) {
    const monto = parseFloat(m.monto);
    if (m.tipo === 'Egreso' || m.tipo === 'Anulacion') {
      if (m.metodo === 'Efectivo') efectivo -= monto;
      if (m.metodo === 'Yape')     yape     -= monto;
    } else if (m.metodo === 'Efectivo') {
      efectivo += monto;
    } else if (m.metodo === 'Yape') {
      yape += monto;
    }
  }

  return {
    monto_esperado_efectivo: parseFloat(efectivo.toFixed(2)),
    monto_esperado_yape:     parseFloat(yape.toFixed(2)),
  };
}

module.exports = { calcularEsperados };
