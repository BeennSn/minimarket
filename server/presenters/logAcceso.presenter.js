/**
 * logAcceso.presenter.js
 * Formatea las respuestas del panel de logs de acceso (Administrador).
 */

const presentarLog = (log) => ({
  id:             log.id,
  usuario_id:     log.usuario_id,
  nombre_usuario: log.nombre_usuario,
  rol:            log.rol,
  tipo:           log.tipo,
  fecha_hora:     log.fecha_hora,
  detalle:        log.detalle,
});

const presentarLista = (logs) => logs.map(presentarLog);

module.exports = { presentarLog, presentarLista };
