const { Op } = require('sequelize');
const { LogAcceso } = require('../models');
const { presentarLista } = require('../presenters/logAcceso.presenter');

const TIPOS_VALIDOS = ['Login', 'Logout', 'Otro'];

const listar = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, usuario_id, tipo, nombre, pagina, limite } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta && new Date(fecha_inicio) > new Date(fecha_hasta)) {
      return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser posterior a la fecha final' });
    }

    if (fecha_inicio && fecha_hasta) {
      const hasta = new Date(fecha_hasta);
      hasta.setDate(hasta.getDate() + 1);
      where.fecha_hora = { [Op.between]: [new Date(fecha_inicio), hasta] };
    } else if (fecha_inicio) {
      where.fecha_hora = { [Op.gte]: new Date(fecha_inicio) };
    } else if (fecha_hasta) {
      const hasta = new Date(fecha_hasta);
      hasta.setDate(hasta.getDate() + 1);
      where.fecha_hora = { [Op.lt]: hasta };
    }

    if (usuario_id) {
      where.usuario_id = usuario_id;
    }

    if (tipo) {
      if (!TIPOS_VALIDOS.includes(tipo)) {
        return res.status(400).json({ mensaje: `El tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
      }
      where.tipo = tipo;
    }

    if (nombre) {
      where.nombre_usuario = { [Op.iLike]: `%${nombre}%` };
    }

    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limite) || 25));
    const offset = (page - 1) * limit;

    const { count, rows } = await LogAcceso.findAndCountAll({
      where,
      order: [['fecha_hora', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      data: presentarLista(rows),
      pagination: {
        total: count,
        pagina: page,
        limite: limit,
        totalPaginas: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Error en listar logs de acceso:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listar };
