export function formatMoneda(valor) {
  return `S./ ${parseFloat(valor).toFixed(2)}`;
}

// Para fechas "solo fecha" (sin hora, ej. fecha_vencimiento) el backend manda
// un string 'YYYY-MM-DD'. `new Date('YYYY-MM-DD')` lo interpreta como
// medianoche UTC, y al mostrarlo en un navegador en Perú (UTC-5) se corre un
// día hacia atrás (14/07 aparecía como 13/07). Por eso se extraen los
// componentes directo del string en vez de pasar por conversión de zona
// horaria — esto NO aplica a timestamps reales (createdAt, fecha_hora), que
// sí deben mostrarse en la hora local del navegador (ver formatFechaHora).
export function formatFecha(fecha) {
  if (!fecha) return '';
  if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [yy, mm, dd] = fecha.split('-');
    return `${dd}/${mm}/${yy}`;
  }
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function formatFechaHora(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

export function formatStock(stock) {
  return `${stock} und(s)`;
}

// 'YYYY-MM-DD' de una fecha en el calendario LOCAL del navegador (no UTC).
// `date.toISOString().split('T')[0]` se usaba para esto en varios formularios
// (mínimos de fecha de vencimiento), pero toISOString() convierte a UTC
// primero — de noche en Perú (UTC-5) eso adelanta la fecha un día. Esto
// extrae año/mes/día directo de los getters locales, sin pasar por UTC.
export function fechaLocalISO(date = new Date()) {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
