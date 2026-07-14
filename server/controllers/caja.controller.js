const { Op } = require('sequelize');
const { sequelize, Turno, MovimientoCaja, Usuario } = require('../models');
const { presentarTurno, presentarMovimiento } = require('../presenters/caja.presenter');
const { inicioDiaPeru, finDiaPeruExclusivo } = require('../utils/fechas');
const { calcularEsperados } = require('../services/caja.service');

// Mínimo exigido para abrir un turno de caja: debe alcanzar para dar vueltos
// desde la primera venta del día. Mismo valor duplicado (a propósito, no hay
// mecanismo de config compartida cliente/servidor en este proyecto) en
// client/src/modules/caja/CajaPage.jsx — si se cambia acá, cambiar también ahí.
const MONTO_MINIMO_APERTURA_CAJA = 200;

const INCLUDE_TURNO = [
  { association: 'cajero',    attributes: ['id', 'nombre'] },
  { association: 'aprobador', attributes: ['id', 'nombre'] },
  {
    association: 'movimientos',
    include: [{ association: 'usuario', attributes: ['id', 'nombre'] }],
    order: [['createdAt', 'ASC']],
  },
];

// ─── Abrir turno ───────────────────────────────────────────────────────────────
const abrir = async (req, res) => {
  try {
    const { monto_apertura } = req.body;
    const montoAperturaNum = parseFloat(monto_apertura);

    if (!monto_apertura || isNaN(montoAperturaNum) || montoAperturaNum < MONTO_MINIMO_APERTURA_CAJA) {
      return res.status(400).json({
        mensaje: `El monto mínimo de apertura es S/ ${MONTO_MINIMO_APERTURA_CAJA.toFixed(2)}, para poder dar vueltos durante el turno.`,
      });
    }

    const turnoAbierto = await Turno.findOne({
      where: { usuario_id: req.usuario.id, estado: 'Abierto' },
    });
    if (turnoAbierto) {
      return res.status(400).json({ mensaje: 'Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.' });
    }

    let turno;
    try {
      turno = await sequelize.transaction(async (t) => {
        const nuevoTurno = await Turno.create({
          usuario_id:     req.usuario.id,
          monto_apertura: montoAperturaNum,
          estado:         'Abierto',
          fecha_apertura: new Date(),
        }, { transaction: t });

        await MovimientoCaja.create({
          turno_id:    nuevoTurno.id,
          tipo:        'Apertura',
          descripcion: 'Apertura de turno',
          metodo:      'Efectivo',
          monto:       montoAperturaNum,
          usuario_id:  req.usuario.id,
        }, { transaction: t });

        return nuevoTurno;
      });
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ mensaje: 'Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.' });
      }
      throw err;
    }

    const turnoCompleto = await Turno.findByPk(turno.id, { include: INCLUDE_TURNO });
    return res.status(201).json(presentarTurno(turnoCompleto));
  } catch (err) {
    console.error('Error al abrir turno:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Cerrar turno ──────────────────────────────────────────────────────────────
const cerrar = async (req, res) => {
  try {
    const { monto_contado_efectivo, monto_contado_yape, observaciones } = req.body;

    if (monto_contado_efectivo === undefined || monto_contado_yape === undefined) {
      return res.status(400).json({ mensaje: 'Debes ingresar el monto contado de efectivo y Yape' });
    }
    const efectivoNum = parseFloat(monto_contado_efectivo);
    const yapeNum = parseFloat(monto_contado_yape);
    if (!Number.isFinite(efectivoNum) || efectivoNum < 0 || !Number.isFinite(yapeNum) || yapeNum < 0) {
      return res.status(400).json({ mensaje: 'Los montos contados deben ser números válidos mayores o iguales a 0' });
    }

    const turno = await Turno.findOne({
      where: { usuario_id: req.usuario.id, estado: 'Abierto' },
      include: [{ association: 'movimientos' }],
    });
    if (!turno) {
      return res.status(404).json({ mensaje: 'No tienes un turno abierto' });
    }

    const { monto_esperado_efectivo, monto_esperado_yape } = calcularEsperados(turno.movimientos);

    const contadoEfectivo = parseFloat(monto_contado_efectivo);
    const contadoYape     = parseFloat(monto_contado_yape);

    turno.estado                  = 'Cerrado';
    turno.fecha_cierre            = new Date();
    turno.monto_esperado_efectivo = monto_esperado_efectivo;
    turno.monto_esperado_yape     = monto_esperado_yape;
    turno.monto_contado_efectivo  = contadoEfectivo;
    turno.monto_contado_yape      = contadoYape;
    turno.diferencia_efectivo     = parseFloat((contadoEfectivo - monto_esperado_efectivo).toFixed(2));
    turno.diferencia_yape         = parseFloat((contadoYape     - monto_esperado_yape).toFixed(2));
    turno.observaciones           = observaciones || null;
    await turno.save();

    const turnoCompleto = await Turno.findByPk(turno.id, { include: INCLUDE_TURNO });
    return res.status(200).json(presentarTurno(turnoCompleto));
  } catch (err) {
    console.error('Error al cerrar turno:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener turno activo del usuario ─────────────────────────────────────────
const obtenerActivo = async (req, res) => {
  try {
    const turno = await Turno.findOne({
      where: { usuario_id: req.usuario.id, estado: 'Abierto' },
      include: INCLUDE_TURNO,
    });

    if (!turno) {
      return res.status(200).json(null);
    }

    return res.status(200).json(presentarTurno(turno));
  } catch (err) {
    console.error('Error al obtener turno activo:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Registrar movimiento manual (Ingreso / Egreso) ───────────────────────────
const registrarMovimiento = async (req, res) => {
  try {
    const { tipo, descripcion, metodo, monto } = req.body;

    if (!['Ingreso', 'Egreso'].includes(tipo)) {
      return res.status(400).json({ mensaje: 'Tipo de movimiento inválido. Use Ingreso o Egreso' });
    }
    if (!['Efectivo', 'Yape'].includes(metodo)) {
      return res.status(400).json({ mensaje: 'Método inválido. Use Efectivo o Yape' });
    }
    if (!monto || isNaN(monto) || parseFloat(monto) <= 0) {
      return res.status(400).json({ mensaje: 'El monto debe ser mayor a 0' });
    }
    if (!descripcion || !descripcion.trim()) {
      return res.status(400).json({ mensaje: 'La descripción es obligatoria' });
    }

    const turno = await Turno.findOne({
      where: { usuario_id: req.usuario.id, estado: 'Abierto' },
    });
    if (!turno) {
      return res.status(404).json({ mensaje: 'No tienes un turno abierto' });
    }

    const movimiento = await MovimientoCaja.create({
      turno_id:    turno.id,
      tipo,
      descripcion: descripcion.trim(),
      metodo,
      monto:       parseFloat(monto),
      usuario_id:  req.usuario.id,
    });

    const movConUsuario = await MovimientoCaja.findByPk(movimiento.id, {
      include: [{ association: 'usuario', attributes: ['id', 'nombre'] }],
    });

    return res.status(201).json(presentarMovimiento(movConUsuario));
  } catch (err) {
    console.error('Error al registrar movimiento:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Historial de turnos (Admin / Gerente) ────────────────────────────────────
const historial = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, usuario_id, estado } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta && new Date(fecha_inicio) > new Date(fecha_hasta)) {
      return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser posterior a la fecha final' });
    }

    if (fecha_inicio && fecha_hasta) {
      where.fecha_apertura = { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.fecha_apertura = { [Op.gte]: inicioDiaPeru(fecha_inicio) };
    } else if (fecha_hasta) {
      where.fecha_apertura = { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) };
    }

    if (usuario_id) where.usuario_id = usuario_id;
    if (estado)     where.estado = estado;

    const turnos = await Turno.findAll({
      where,
      include: [
        { association: 'cajero',    attributes: ['id', 'nombre'] },
        { association: 'aprobador', attributes: ['id', 'nombre'] },
      ],
      order: [['fecha_apertura', 'DESC']],
    });

    return res.status(200).json(turnos.map(presentarTurno));
  } catch (err) {
    console.error('Error al listar turnos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener turno con movimientos (Admin / Gerente) ──────────────────────────
const obtenerTurno = async (req, res) => {
  try {
    const turno = await Turno.findByPk(req.params.id, { include: INCLUDE_TURNO });
    if (!turno) return res.status(404).json({ mensaje: 'Turno no encontrado' });
    return res.status(200).json(presentarTurno(turno));
  } catch (err) {
    console.error('Error al obtener turno:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Aprobar cierre de turno ──────────────────────────────────────────────────
const aprobar = async (req, res) => {
  try {
    const turno = await Turno.findByPk(req.params.id);
    if (!turno) return res.status(404).json({ mensaje: 'Turno no encontrado' });

    if (turno.estado !== 'Cerrado') {
      return res.status(400).json({ mensaje: 'Solo se pueden aprobar turnos cerrados' });
    }
    if (turno.aprobado_por) {
      return res.status(400).json({ mensaje: 'Este turno ya fue aprobado' });
    }

    turno.aprobado_por = req.usuario.id;
    await turno.save();

    const turnoCompleto = await Turno.findByPk(turno.id, { include: INCLUDE_TURNO });
    return res.status(200).json(presentarTurno(turnoCompleto));
  } catch (err) {
    console.error('Error al aprobar turno:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { abrir, cerrar, obtenerActivo, registrarMovimiento, historial, obtenerTurno, aprobar };
