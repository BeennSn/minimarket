const { Op } = require('sequelize');
const {
  sequelize,
  Producto,
  Proveedor,
  EntradaMercaderia,
  BajaInventario,
  SolicitudReposicion,
  Usuario,
  AjusteInventario,
} = require('../models');
const { presentarEntrada, presentarBaja, presentarSolicitud, presentarAjuste } = require('../presenters/inventario.presenter');
const { crearLote, consumirStockFIFO } = require('../services/inventario.service');
const { inicioDiaPeru, finDiaPeruExclusivo } = require('../utils/fechas');

const AÑOS_MAXIMOS_VENCIMIENTO = 15;

// Si el producto maneja vencimiento, la fecha es obligatoria: un lote sin
// fecha de vencimiento se trata como vigente para siempre (nunca se bloquea
// su venta aunque pase el tiempo), así que dejarla vacía anularía en la
// práctica el control de "no vender vencido". Si el producto NO maneja
// vencimiento (ferretería, ropa, etc.) el campo no aplica y no se valida.
// No se exige un mínimo de días desde hoy: hay productos de vida corta
// legítimos (pan del día, lácteos) que vencen mañana mismo — ese caso se
// advierte en el frontend, no se bloquea aquí. Sí se pone un tope superior
// para atrapar errores de tipeo obvios (ej. poner "2099" sin querer).
const validarFechaVencimiento = (fechaStr, manejaVencimiento = true) => {
  if (!manejaVencimiento) return null;
  if (!fechaStr) return 'La fecha de vencimiento es obligatoria para este producto';
  const fecha = new Date(fechaStr + 'T00:00:00');
  if (isNaN(fecha.getTime())) return 'Fecha de vencimiento inválida';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (fecha < hoy) return 'La fecha de vencimiento no puede ser anterior a hoy';
  const fechaMaxima = new Date(hoy);
  fechaMaxima.setFullYear(fechaMaxima.getFullYear() + AÑOS_MAXIMOS_VENCIMIENTO);
  if (fecha > fechaMaxima) return `La fecha de vencimiento no puede ser mayor a ${AÑOS_MAXIMOS_VENCIMIENTO} años a partir de hoy`;
  return null;
};

const INCLUDES_ENTRADA = [
  { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
  { association: 'proveedor', attributes: ['id', 'nombre'] },
  { association: 'usuario', attributes: ['id', 'nombre'] },
  { association: 'solicitud', attributes: ['id'] },
  { association: 'ajuste', attributes: ['id'] },
];

// ─── Entradas ─────────────────────────────────────────────────────────────────

const registrarEntrada = async (req, res) => {
  try {
    const { producto_id, proveedor_id, cantidad, fecha_vencimiento, costo_unitario } = req.body;

    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser un número entero mayor a 0' });
    }

    if (costo_unitario != null && (isNaN(Number(costo_unitario)) || Number(costo_unitario) <= 0)) {
      return res.status(400).json({ mensaje: 'El costo unitario debe ser mayor a 0' });
    }

    const entrada = await sequelize.transaction(async (t) => {
      const producto = await Producto.findByPk(producto_id, { transaction: t });
      if (!producto || !producto.activo) {
        throw { status: 404, mensaje: 'Producto no encontrado o inactivo' };
      }

      const errorFecha = validarFechaVencimiento(fecha_vencimiento, producto.maneja_vencimiento);
      if (errorFecha) throw { status: 400, mensaje: errorFecha };

      const proveedor = await Proveedor.findByPk(proveedor_id, { transaction: t });
      if (!proveedor || !proveedor.activo) {
        throw { status: 404, mensaje: 'Proveedor no encontrado o inactivo' };
      }

      const cantidadUnidadesVenta = Number(cantidad) * producto.factor_conversion;

      return crearLote({
        producto_id,
        proveedor_id,
        cantidad: cantidadUnidadesVenta,
        fecha_vencimiento: producto.maneja_vencimiento ? (fecha_vencimiento || null) : null,
        usuario_id: req.usuario.id,
        costo_unitario: costo_unitario != null ? Number(costo_unitario) : null,
        cantidad_unidad_compra: Number(cantidad),
        unidad_compra_snapshot: producto.unidad_compra,
      }, t);
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
      where.createdAt = { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: inicioDiaPeru(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) };
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

const MOTIVOS_BAJA = ['Vencido', 'Dañado', 'Robo o faltante', 'Consumo interno', 'Error de registro', 'Otro'];

const registrarBaja = async (req, res) => {
  try {
    const { producto_id, cantidad, motivo, motivo_detalle } = req.body;

    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) < 1) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser un número entero mayor a 0' });
    }

    if (!motivo || !MOTIVOS_BAJA.includes(motivo)) {
      return res.status(400).json({ mensaje: 'El motivo de baja no es válido' });
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
        motivo_detalle: motivo_detalle || null,
        usuario_id: req.usuario.id,
      }, { transaction: t });

      await consumirStockFIFO({
        producto_id,
        cantidad,
        tipo: 'Baja',
        referencia: { baja_id: bajaCreada.id },
      }, t);

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
      where.createdAt = { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: inicioDiaPeru(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) };
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

// ─── Ajustes (conteo físico) ────────────────────────────────────────────────────

const registrarAjuste = async (req, res) => {
  try {
    const { producto_id, cantidad_contada, observaciones } = req.body;

    if (!Number.isInteger(Number(cantidad_contada)) || Number(cantidad_contada) < 0) {
      return res.status(400).json({ mensaje: 'La cantidad contada debe ser un número entero mayor o igual a 0' });
    }

    const ajuste = await sequelize.transaction(async (t) => {
      const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!producto || !producto.activo) {
        throw { status: 404, mensaje: 'Producto no encontrado o inactivo' };
      }

      const cantidadSistema = producto.stock;
      const cantidadContada = Number(cantidad_contada);
      const diferencia = cantidadContada - cantidadSistema;

      if (diferencia === 0) {
        throw { status: 400, mensaje: 'El conteo coincide con el stock del sistema; no se requiere ajuste' };
      }

      const ajusteCreado = await AjusteInventario.create({
        producto_id,
        cantidad_sistema: cantidadSistema,
        cantidad_contada: cantidadContada,
        diferencia,
        observaciones: observaciones || null,
        usuario_id: req.usuario.id,
      }, { transaction: t });

      if (diferencia > 0) {
        await crearLote({
          producto_id,
          proveedor_id: null,
          cantidad: diferencia,
          fecha_vencimiento: null,
          usuario_id: req.usuario.id,
          ajuste_id: ajusteCreado.id,
        }, t);
      } else {
        await consumirStockFIFO({
          producto_id,
          cantidad: Math.abs(diferencia),
          tipo: 'Ajuste',
          referencia: { ajuste_id: ajusteCreado.id },
        }, t);
      }

      return ajusteCreado;
    });

    const ajusteCompleto = await AjusteInventario.findByPk(ajuste.id, {
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'usuario', attributes: ['id', 'nombre'] },
      ],
    });

    return res.status(201).json(presentarAjuste(ajusteCompleto));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en registrarAjuste:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listarAjustes = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, producto_id } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta) {
      where.createdAt = { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: inicioDiaPeru(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) };
    }

    if (producto_id) {
      where.producto_id = producto_id;
    }

    const ajustes = await AjusteInventario.findAll({
      where,
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
        { association: 'usuario', attributes: ['id', 'nombre'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(ajustes.map(presentarAjuste));
  } catch (err) {
    console.error('Error en listarAjustes:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Solicitudes ──────────────────────────────────────────────────────────────

const INCLUDE_SOLICITUD = [
  { association: 'producto', attributes: ['id', 'nombre', 'marca', 'maneja_vencimiento'] },
  { association: 'proveedor', attributes: ['id', 'nombre'] },
  { association: 'solicitante', attributes: ['id', 'nombre'] },
  { association: 'aprobador', attributes: ['id', 'nombre'] },
];

const crearSolicitud = async (req, res) => {
  try {
    const { producto_id, cantidad, proveedor_id } = req.body;

    if (!Number.isInteger(Number(cantidad)) || Number(cantidad) <= 0) {
      return res.status(400).json({ mensaje: 'La cantidad debe ser un número entero mayor a 0' });
    }

    const producto = await Producto.findByPk(producto_id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const solicitudActiva = await SolicitudReposicion.findOne({
      where: { producto_id, estado: { [Op.in]: ['Pendiente', 'Aprobada'] } },
    });
    if (solicitudActiva) {
      return res.status(400).json({ mensaje: 'Ya existe una solicitud pendiente o aprobada para este producto' });
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

const completarSolicitud = async (req, res) => {
  try {
    const solicitud = await SolicitudReposicion.findByPk(req.params.id, {
      include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca', 'stock', 'maneja_vencimiento'] }],
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

    const errorFecha = validarFechaVencimiento(fechaVencimiento, solicitud.producto.maneja_vencimiento);
    if (errorFecha) return res.status(400).json({ mensaje: errorFecha });

    await sequelize.transaction(async (t) => {
      solicitud.estado = 'Completada';
      await solicitud.save({ transaction: t });

      await crearLote({
        producto_id: solicitud.producto_id,
        proveedor_id: solicitud.proveedor_id,
        cantidad: cantidadRecibida,
        fecha_vencimiento: solicitud.producto.maneja_vencimiento ? fechaVencimiento : null,
        usuario_id: req.usuario.id,
        solicitud_id: solicitud.id,
      }, t);
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
  registrarAjuste,
  listarAjustes,
  crearSolicitud,
  listarSolicitudes,
  aprobarSolicitud,
  rechazarSolicitud,
  completarSolicitud,
};
