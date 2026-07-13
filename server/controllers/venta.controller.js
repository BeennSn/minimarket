const { Op } = require('sequelize');
const { sequelize, Venta, DetalleVenta, Producto, Usuario, Cliente, Turno, MovimientoCaja } = require('../models');
const { presentarVenta, presentarLista } = require('../presenters/venta.presenter');
const { consumirStockFIFO, revertirConsumo } = require('../services/inventario.service');

const INCLUDE_VENTA = [
  { association: 'usuario', attributes: ['id', 'nombre'] },
  { association: 'cliente', attributes: ['id', 'nombre', 'dni'] },
  { association: 'anulador', attributes: ['id', 'nombre'] },
  {
    association: 'detalles',
    include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca'] }],
  },
];

const registrar = async (req, res) => {
  try {
    const { cliente_id, metodo_pago, monto_recibido, items, tipo_comprobante, cliente_dni, cliente_ruc, cliente_razon_social, cliente_direccion, yape_verificado, referencia_pago } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ mensaje: 'La venta debe tener al menos un producto' });
    }

    if (!['Efectivo', 'Yape'].includes(metodo_pago)) {
      return res.status(400).json({ mensaje: 'El método de pago debe ser Efectivo o Yape' });
    }

    for (const item of items) {
      if (!item.producto_id || item.producto_id <= 0) {
        return res.status(400).json({ mensaje: 'Cada item debe tener un producto válido' });
      }
      if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1) {
        return res.status(400).json({ mensaje: 'La cantidad de cada item debe ser un número entero mayor a 0' });
      }
    }

    if (tipo_comprobante === 'Factura' && !/^\d{11}$/.test(cliente_ruc)) {
      return res.status(400).json({ mensaje: 'Para emitir factura se requiere un RUC válido de 11 dígitos' });
    }

    if (tipo_comprobante === 'BoletaDNI') {
      if (!/^\d{8}$/.test(cliente_dni)) {
        return res.status(400).json({ mensaje: 'Para boleta con DNI se requiere un DNI válido de 8 dígitos' });
      }
      const clienteVerificado = cliente_id && await Cliente.findOne({ where: { id: cliente_id, dni: cliente_dni } });
      if (!clienteVerificado) {
        return res.status(400).json({ mensaje: 'El DNI debe verificarse (consulta RENIEC) antes de registrar la venta' });
      }
    }

    // ─── Validaciones previas (fuera de transacción) ──────────────────────────
    let monto_total_prev = 0;
    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id);
      if (!producto || !producto.activo) {
        return res.status(400).json({ mensaje: 'Producto no encontrado o inactivo' });
      }
      if (producto.stock < item.cantidad) {
        return res.status(400).json({ mensaje: `Stock insuficiente para: ${producto.nombre}` });
      }
      monto_total_prev += parseFloat(item.cantidad * producto.precio);
    }

    if (metodo_pago === 'Efectivo') {
      const montoRecibidoNum = parseFloat(monto_recibido);
      if (!Number.isFinite(montoRecibidoNum) || montoRecibidoNum < 0 || montoRecibidoNum > 999999.99) {
        return res.status(400).json({ mensaje: 'Monto recibido inválido' });
      }
      if (montoRecibidoNum < monto_total_prev) {
        return res.status(400).json({ mensaje: 'Monto recibido insuficiente' });
      }
    }

    const venta = await sequelize.transaction(async (t) => {
      let monto_total = 0;
      const detallesData = [];

      const itemsOrdenados = [...items].sort((a, b) => a.producto_id - b.producto_id);
      for (const item of itemsOrdenados) {
        const producto = await Producto.findByPk(item.producto_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!producto || !producto.activo) throw { status: 400, mensaje: 'Producto no encontrado o inactivo' };
        if (producto.stock < item.cantidad) throw { status: 400, mensaje: `Stock insuficiente para: ${producto.nombre}` };
        const subtotal = parseFloat(item.cantidad * producto.precio);
        monto_total += subtotal;

        detallesData.push({
          producto_id:     item.producto_id,
          cantidad:        item.cantidad,
          precio_unitario: producto.precio,
          subtotal,
        });
      }

      if (metodo_pago === 'Efectivo' && parseFloat(monto_recibido) < monto_total) {
        throw { status: 400, mensaje: 'Monto recibido insuficiente' };
      }

      const vuelto = metodo_pago === 'Efectivo'
        ? parseFloat(monto_recibido) - monto_total
        : null;

      const esYapeVerificado = metodo_pago === 'Yape' && yape_verificado === true;

      const nuevaVenta = await Venta.create({
        usuario_id:    req.usuario.id,
        cliente_id:    cliente_id || null,
        metodo_pago,
        monto_total:   monto_total.toFixed(2),
        monto_recibido: metodo_pago === 'Efectivo' ? monto_recibido : null,
        monto_yape:    metodo_pago === 'Yape' ? monto_total.toFixed(2) : null,
        vuelto:        metodo_pago === 'Efectivo' ? vuelto.toFixed(2) : null,
        tipo_comprobante: tipo_comprobante || 'Boleta',
        cliente_dni:   cliente_dni || null,
        cliente_ruc:   cliente_ruc || null,
        cliente_razon_social: cliente_razon_social || null,
        cliente_direccion: cliente_direccion || null,
        yape_verificado: esYapeVerificado,
        yape_verificado_por: esYapeVerificado ? req.usuario.id : null,
        yape_verificado_en: esYapeVerificado ? new Date() : null,
        referencia_pago: metodo_pago === 'Yape' ? (referencia_pago || null) : null,
      }, { transaction: t });

      const detalles = await DetalleVenta.bulkCreate(
        detallesData.map((d) => ({ ...d, venta_id: nuevaVenta.id })),
        { transaction: t, returning: true }
      );

      // Descontar stock de los lotes en orden FEFO (primero vence, primero sale)
      for (const detalle of detalles) {
        await consumirStockFIFO({
          producto_id: detalle.producto_id,
          cantidad:    detalle.cantidad,
          tipo:        'Venta',
          referencia:  { detalle_venta_id: detalle.id },
        }, t);
      }

      // Registrar movimiento en turno activo si existe (no bloquea la venta si no hay turno)
      const turnoActivo = await Turno.findOne({
        where: { usuario_id: req.usuario.id, estado: 'Abierto' },
        transaction: t,
      });
      if (turnoActivo) {
        await MovimientoCaja.create({
          turno_id:    turnoActivo.id,
          tipo:        'Venta',
          descripcion: `Venta #${nuevaVenta.id}`,
          metodo:      metodo_pago === 'Efectivo' ? 'Efectivo' : 'Yape',
          monto:       monto_total.toFixed(2),
          venta_id:    nuevaVenta.id,
          usuario_id:  req.usuario.id,
        }, { transaction: t });
      }

      return { venta: nuevaVenta, detalles };
    });

    const ventaCompleta = await Venta.findByPk(venta.venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(201).json(presentarVenta(ventaCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en registrar venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listar = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, metodo_pago, pagina, limite } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta && new Date(fecha_inicio) > new Date(fecha_hasta)) {
      return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser posterior a la fecha final' });
    }

    if (fecha_inicio && fecha_hasta) {
      where.createdAt = { [Op.between]: [new Date(fecha_inicio), new Date(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: new Date(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lte]: new Date(fecha_hasta) };
    }

    if (metodo_pago) {
      where.metodo_pago = metodo_pago;
    }

    // Un Vendedor solo ve sus propias ventas; Administrador/Gerente ven todas.
    if (req.usuario.rol === 'Vendedor') {
      where.usuario_id = req.usuario.id;
    }

    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limite) || 25));
    const offset = (page - 1) * limit;

    const { count, rows } = await Venta.findAndCountAll({
      where,
      include: INCLUDE_VENTA,
      order: [['createdAt', 'DESC']],
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
    console.error('Error en listar ventas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtener = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: INCLUDE_VENTA,
    });

    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }

    if (req.usuario.rol === 'Vendedor' && venta.usuario_id !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta venta' });
    }

    return res.status(200).json(presentarVenta(venta));
  } catch (err) {
    console.error('Error en obtener venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const verificarYape = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id);

    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }

    if (venta.metodo_pago !== 'Yape') {
      return res.status(400).json({ mensaje: 'La venta no es de tipo Yape' });
    }

    if (venta.yape_verificado) {
      return res.status(400).json({ mensaje: 'El Yape ya fue verificado anteriormente' });
    }

    venta.yape_verificado = true;
    venta.yape_verificado_por = req.usuario.id;
    venta.yape_verificado_en = new Date();
    await venta.save();

    const ventaCompleta = await Venta.findByPk(venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(200).json(presentarVenta(ventaCompleta));
  } catch (err) {
    console.error('Error en verificarYape:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const anular = async (req, res) => {
  try {
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ mensaje: 'El motivo de anulación es obligatorio' });
    }

    const venta = await Venta.findByPk(req.params.id, {
      include: [{ association: 'detalles' }],
    });
    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }
    if (venta.estado === 'Anulada') {
      return res.status(400).json({ mensaje: 'La venta ya fue anulada' });
    }

    const movimientoVenta = await MovimientoCaja.findOne({ where: { venta_id: venta.id, tipo: 'Venta' } });
    if (!movimientoVenta) {
      return res.status(400).json({ mensaje: 'No se puede anular: la venta no tiene un turno de caja asociado' });
    }

    const turno = await Turno.findByPk(movimientoVenta.turno_id);
    if (!turno || turno.estado !== 'Abierto') {
      return res.status(400).json({ mensaje: 'Solo se pueden anular ventas del turno de caja actualmente abierto' });
    }

    await sequelize.transaction(async (t) => {
      for (const detalle of venta.detalles) {
        await revertirConsumo({ tipo: 'Venta', referencia_id: detalle.id }, t);
      }

      venta.estado = 'Anulada';
      venta.motivo_anulacion = motivo.trim();
      venta.anulado_por = req.usuario.id;
      venta.anulado_en = new Date();
      await venta.save({ transaction: t });

      await MovimientoCaja.create({
        turno_id:    turno.id,
        tipo:        'Anulacion',
        descripcion: `Anulación venta #${venta.id}: ${motivo.trim()}`,
        metodo:      movimientoVenta.metodo,
        monto:       movimientoVenta.monto,
        venta_id:    venta.id,
        usuario_id:  req.usuario.id,
      }, { transaction: t });
    });

    const ventaCompleta = await Venta.findByPk(venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(200).json(presentarVenta(ventaCompleta));
  } catch (err) {
    console.error('Error al anular venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { registrar, listar, obtener, verificarYape, anular };
