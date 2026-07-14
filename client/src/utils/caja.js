/**
 * caja.js
 * Calcula los montos de efectivo/Yape acumulados en un turno a partir de sus
 * movimientos. Compartido entre CajaPage y VentasPage — antes cada uno tenía
 * su propia copia y una de las dos arrancaba el acumulador en monto_apertura
 * Y volvía a sumar el propio movimiento de apertura dentro del bucle,
 * duplicándolo. Debe reflejar la misma regla que calcularEsperados() en
 * server/services/caja.service.js: arrancar en 0, el movimiento tipo
 * 'Apertura' ya viene incluido en `movimientos` y se suma como cualquier otro.
 */
export function calcularMontosCaja(movimientos) {
  let efectivo = 0;
  let yape = 0;

  for (const m of movimientos || []) {
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

  return { efectivo, yape };
}
