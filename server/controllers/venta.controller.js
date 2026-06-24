const { Op } = require('sequelize');
const { sequelize, Venta, DetalleVenta, Producto, Usuario, Cliente } = require('../models');
const { presentarVenta, presentarLista } = require('../presenters/venta.presenter');

const registrar = async (req, res) => {
  try {
    const { cliente_id, metodo_pago, monto_recibido, monto_yape, monto_efectivo, items, tipo_comprobante, cliente_dni, cliente_ruc, cliente_razon_social, cliente_direccion } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ mensaje: 'La venta debe tener al menos un producto' });
    }

    const venta = await sequelize.transaction(async (t) => {
      let monto_total = 0;
      const detallesData = [];

      for (const item of items) {
        const producto = await Producto.findByPk(item.producto_id, { transaction: t });
        if (!producto || !producto.activo) {
          throw { status: 400, mensaje: 'Producto no encontrado o inactivo' };
        }
        if (producto.stock < item.cantidad) {
          throw { status: 400, mensaje: `Stock insuficiente para: ${producto.nombre}` };
        }

        const subtotal = parseFloat(item.cantidad * producto.precio);
        monto_total += subtotal;

        detallesData.push({
          producto_id:     item.producto_id,
          cantidad:        item.cantidad,
          precio_unitario: producto.precio,
          subtotal,
        });

        producto.stock -= item.cantidad;
        if (producto.stock === 0) producto.fecha_vencimiento = null;
        await producto.save({ transaction: t });
      }

      if (metodo_pago === 'Efectivo' && parseFloat(monto_recibido) < monto_total) {
        throw { status: 400, mensaje: 'Monto recibido insuficiente' };
      }

      if (metodo_pago === 'Mixto') {
        const yape = parseFloat(monto_yape || 0);
        const efectivo = parseFloat(monto_efectivo || 0);
        if (yape + efectivo !== monto_total) {
          throw { status: 400, mensaje: 'La suma de Yape y Efectivo debe ser igual al total' };
        }
      }

      const vuelto = metodo_pago === 'Efectivo'
        ? parseFloat(monto_recibido) - monto_total
        : 0;

      const nuevaVenta = await Venta.create({
        usuario_id:    req.usuario.id,
        cliente_id:    cliente_id || null,
        metodo_pago,
        monto_total:   monto_total.toFixed(2),
        monto_recibido: metodo_pago === 'Efectivo' ? monto_recibido : null,
        monto_yape:    metodo_pago === 'Mixto' ? monto_yape : null,
        monto_efectivo: metodo_pago === 'Mixto' ? monto_efectivo : null,
        vuelto:        vuelto.toFixed(2),
        tipo_comprobante: tipo_comprobante || 'Boleta',
        cliente_dni:   cliente_dni || null,
        cliente_ruc:   cliente_ruc || null,
        cliente_razon_social: cliente_razon_social || null,
        cliente_direccion: cliente_direccion || null,
      }, { transaction: t });

      const detalles = await DetalleVenta.bulkCreate(
        detallesData.map((d) => ({ ...d, venta_id: nuevaVenta.id })),
        { transaction: t }
      );

      return { venta: nuevaVenta, detalles };
    });

    const ventaCompleta = await Venta.findByPk(venta.venta.id, {
      include: [
        { association: 'usuario', attributes: ['id', 'nombre'] },
        { association: 'cliente', attributes: ['id', 'nombre', 'dni'] },
        {
          association: 'detalles',
          include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca'] }],
        },
      ],
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
    const { fecha_inicio, fecha_hasta, metodo_pago } = req.query;
    const where = {};

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

    const ventas = await Venta.findAll({
      where,
      include: [
        { association: 'usuario', attributes: ['id', 'nombre'] },
        { association: 'cliente', attributes: ['id', 'nombre', 'dni'] },
        {
          association: 'detalles',
          include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json(presentarLista(ventas));
  } catch (err) {
    console.error('Error en listar ventas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtener = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: [
        { association: 'usuario', attributes: ['id', 'nombre'] },
        { association: 'cliente', attributes: ['id', 'nombre', 'dni'] },
        {
          association: 'detalles',
          include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca'] }],
        },
      ],
    });

    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }

    return res.status(200).json(presentarVenta(venta));
  } catch (err) {
    console.error('Error en obtener venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { registrar, listar, obtener };
