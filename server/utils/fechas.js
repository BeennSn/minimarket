/**
 * fechas.js
 * Helpers para convertir filtros de fecha (YYYY-MM-DD, sin hora) enviados
 * desde el frontend en límites de rango correctos en hora de Perú.
 *
 * Perú es UTC-5 todo el año (sin horario de verano). Sin esto, `new
 * Date('2026-07-13')` se interpreta como medianoche UTC, que en Lima ya es
 * "12/07 7:00 p.m." — un filtro "Desde 13 Hasta 13" terminaba mostrando
 * registros del 12 hechos en la noche.
 */

const OFFSET_PERU = '-05:00';

// 00:00:00 hora Perú del día indicado, como instante UTC real.
function inicioDiaPeru(fechaStr) {
  return new Date(`${fechaStr}T00:00:00.000${OFFSET_PERU}`);
}

// 00:00:00 hora Perú del día SIGUIENTE — límite superior exclusivo, para que
// un filtro "Hasta" cubra el día completo en hora local, no en hora UTC.
function finDiaPeruExclusivo(fechaStr) {
  const inicio = inicioDiaPeru(fechaStr);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
}

// Fecha de HOY en Perú como string 'YYYY-MM-DD' (no como instante). Para
// comparar contra columnas DATEONLY (ej. fecha_vencimiento) hay que comparar
// fecha contra fecha, no fecha contra un instante UTC — si no, el servidor
// (que corre en UTC) puede pensar que "hoy" ya es mañana o que todavía es
// ayer según la hora del día, y el corte de vencimiento queda corrido.
function hoyPeru() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

module.exports = { inicioDiaPeru, finDiaPeruExclusivo, hoyPeru };
