const { Op } = require('sequelize');
const {
  sequelize,
  Producto,
  Proveedor,
  EntradaMercaderia,
  BajaInventario,
  SolicitudReposicion,
  Usuario,
} = require('../models');
const { presentarEntrada, presentarBaja, presentarSolicitud } = require('../presenters/inventario.presenter');

const INCLUDES_ENTRADA = [
  { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
  { association: 'proveedor', attributes: ['id', 'nombre'] },
  { association: 'usuario', attributes: ['id', 'nombre'] },
  { association: 'solicitud', attributes: ['id'] },
];

// ─── Entradas ─────────────────────────────────────────────────────────────────

const registrarEntrada = async (req, res) => {
  try {
    const { producto_id, proveedor_id, cantidad, fecha_vencimiento } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' });
    }

    const entrada = await sequelize.transaction(async (t) => {
      const producto = await Producto.findByPk(producto_id, { transaction: t });
      if (!producto || !producto.activo) {
        throw { status: 404, mensaje: 'Producto no encontrado o inactivo' };
      }

      const proveedor = await Proveedor.findByPk(proveedor_id, { transaction: t });
      if (!proveedor || !proveedor.activo) {
        throw { status: 404, mensaje: 'Proveedor no encontrado o inactivo' };
      }

      const entradaCreada = await EntradaMercaderia.create({
        producto_id,
        proveedor_id,
        cantidad,
        usuario_id: req.usuario.id,
        fecha_vencimiento: fecha_vencimiento || null,
      }, { transaction: t });

      producto.stock += cantidad;
      await producto.save({ transaction: t });

      return entradaCreada;
    });

    const entradaCompleta = await EntradaMercaderia.findByPk(entrada.id, {
      include: INCLUDES_ENTRADA,
    });

    return res.status(201).json(presentarEntrada(entradaCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en registrarEntrada:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listarEntradas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, producto_id } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta) {
      where.createdAt = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: new Date(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lte]: new Date(fecha_hasta) };
    }

    if (producto_id) {
      where.producto_id = producto_id;
    }

    const entradas = await EntradaMercaderia.findAll({
      where,
      include: INCLUDES_ENTRADA,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(entradas.map(presentarEntrada));
  } catch (err) {
    console.error('Error en listarEntradas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Bajas ────────────────────────────────────────────────────────────────────

const registrarBaja = async (req, res) => {
  try {
    const { producto_id, cantidad, motivo } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' });
    }

    const baja = await sequelize.transaction(async (t) => {
      const producto = await Producto.findByPk(producto_id, { transaction: t });
      if (!producto || !producto.activo) {
        throw { status: 404, mensaje: 'Producto no encontrado o inactivo' };
      }

      if (producto.stock < cantidad) {
        throw { status: 400, mensaje: 'Stock insuficiente para realizar la baja' };
      }

      const bajaCreada = await BajaInventario.create({
        producto_id,
        cantidad,
        motivo,
        usuario_id: req.usuario.id,
      }, { transaction: t });

      producto.stock -= cantidad;
      if (producto.stock === 0) producto.fecha_vencimiento = null;
      await producto.save({ transaction: t });

      return bajaCreada;
    });

    const bajaCompleta = await BajaInventario.findByPk(baja.id, {
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'usuario', attributes: ['id', 'nombre'] },
      ],
    });

    return res.status(201).json(presentarBaja(bajaCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en registrarBaja:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listarBajas = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, producto_id } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta) {
      where.createdAt = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: new Date(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lte]: new Date(fecha_hasta) };
    }

    if (producto_id) {
      where.producto_id = producto_id;
    }

    const bajas = await BajaInventario.findAll({
      where,
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'usuario', attributes: ['id', 'nombre'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(bajas.map(presentarBaja));
  } catch (err) {
    console.error('Error en listarBajas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Solicitudes ──────────────────────────────────────────────────────────────

const crearSolicitud = async (req, res) => {
  try {
    const { producto_id, cantidad, proveedor_id } = req.body;

    if (!cantidad || cantidad <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser mayor a 0' });
    }

    const producto = await Producto.findByPk(producto_id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const solicitud = await SolicitudReposicion.create({
      producto_id,
      cantidad,
      proveedor_id: proveedor_id || null,
      estado: 'Pendiente',
      usuario_solicitante_id: req.usuario.id,
    });

    const solicitudCompleta = await SolicitudReposicion.findByPk(solicitud.id, {
      include: INCLUDE_SOLICITUD,
    });

    return res.status(201).json(presentarSolicitud(solicitudCompleta));
  } catch (err) {
    console.error('Error en crearSolicitud:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listarSolicitudes = async (req, res) => {
  try {
    const { estado } = req.query;
    const where = {};

    if (estado) {
      where.estado = estado;
    }

    const solicitudes = await SolicitudReposicion.findAll({
      where,
      include: INCLUDE_SOLICITUD,
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(solicitudes.map(presentarSolicitud));
  } catch (err) {
    console.error('Error en listarSolicitudes:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const aprobarSolicitud = async (req, res) => {
  try {
    const { fecha_estimada, proveedor_id } = req.body;

    const solicitud = await SolicitudReposicion.findByPk(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'Pendiente') {
      return res.status(400).json({ mensaje: 'Solo se pueden aprobar solicitudes pendientes' });
    }

    solicitud.estado = 'Aprobada';
    solicitud.usuario_aprobador_id = req.usuario.id;
    if (fecha_estimada) solicitud.fecha_estimada = fecha_estimada;
    if (proveedor_id) solicitud.proveedor_id = proveedor_id;
    await solicitud.save();

    const solicitudCompleta = await SolicitudReposicion.findByPk(solicitud.id, {
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'proveedor', attributes: ['id', 'nombre'] },
        { association: 'solicitante', attributes: ['id', 'nombre'] },
        { association: 'aprobador', attributes: ['id', 'nombre'] },
      ],
    });

    return res.status(200).json(presentarSolicitud(solicitudCompleta));
  } catch (err) {
    console.error('Error en aprobarSolicitud:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const rechazarSolicitud = async (req, res) => {
  try {
    const { motivo_rechazo } = req.body;

    const solicitud = await SolicitudReposicion.findByPk(req.params.id);
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'Pendiente') {
      return res.status(400).json({ mensaje: 'Solo se pueden rechazar solicitudes pendientes' });
    }

    solicitud.estado = 'Rechazada';
    solicitud.motivo_rechazo = motivo_rechazo;
    solicitud.usuario_aprobador_id = req.usuario.id;
    await solicitud.save();

    const solicitudCompleta = await SolicitudReposicion.findByPk(solicitud.id, {
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'proveedor', attributes: ['id', 'nombre'] },
        { association: 'solicitante', attributes: ['id', 'nombre'] },
        { association: 'aprobador', attributes: ['id', 'nombre'] },
      ],
    });

    return res.status(200).json(presentarSolicitud(solicitudCompleta));
  } catch (err) {
    console.error('Error en rechazarSolicitud:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const INCLUDE_SOLICITUD = [
  { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
  { association: 'proveedor', attributes: ['id', 'nombre'] },
  { association: 'solicitante', attributes: ['id', 'nombre'] },
  { association: 'aprobador', attributes: ['id', 'nombre'] },
];

const completarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudReposicion.findByPk(req.params.id, {
      include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca', 'stock'] }],
    });
    if (!solicitud) {
      return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (solicitud.estado !== 'Aprobada') {
      return res.status(400).json({ mensaje: 'Solo se pueden completar solicitudes aprobadas' });
    }

    if (!solicitud.proveedor_id) {
      return res.status(400).json({ mensaje: 'La solicitud no tiene un proveedor asignado' });
    }

    const cantidadRecibida = req.body.cantidad_recibida
      ? parseInt(req.body.cantidad_recibida, 10)
      : solicitud.cantidad;

    if (cantidadRecibida <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad recibida debe ser mayor a 0' });
    }

    const fechaVencimiento = req.body.fecha_vencimiento || null;

    await sequelize.transaction(async (t) => {
      solicitud.estado = 'Completada';
      await solicitud.save({ transaction: t });

      await EntradaMercaderia.create({
        producto_id: solicitud.producto_id,
        proveedor_id: solicitud.proveedor_id,
        cantidad: cantidadRecibida,
        usuario_id: req.usuario.id,
        solicitud_id: solicitud.id,
        fecha_vencimiento: fechaVencimiento,
      }, { transaction: t });

      const producto = await Producto.findByPk(solicitud.producto_id, { transaction: t });
      if (!producto) throw { status: 404, mensaje: 'Producto no encontrado' };
      producto.stock += cantidadRecibida;
      await producto.save({ transaction: t });
    });

    const solicitudCompleta = await SolicitudReposicion.findByPk(solicitud.id, {
      include: INCLUDE_SOLICITUD,
    });

    return res.status(200).json(presentarSolicitud(solicitudCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en completarSolicitud:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  registrarEntrada,
  listarEntradas,
  registrarBaja,
  listarBajas,
  crearSolicitud,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  completarSolicitud,
};
