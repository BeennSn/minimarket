const { Op } = require('sequelize');
const { sequelize, Venta, DetalleVenta, Producto, Categoria, Proveedor, SolicitudReposicion } = require('../models');
const {
  presentarResumenVentas,
  presentarProductoTop,
  presentarVentasPorDia,
  presentarMetodoPago,
} = require('../presenters/reporte.presenter');

const armarWhereFecha = (req) => {
  const { fecha_inicio, fecha_hasta } = req.query;
  if (!fecha_inicio && !fecha_hasta) return {};

  if (fecha_inicio && fecha_hasta) {
    const hasta = new Date(fecha_hasta);
    hasta.setDate(hasta.getDate() + 1);
    return { createdAt: { [Op.between]: [new Date(fecha_inicio), hasta] } };
  }
  if (fecha_inicio) {
    return { createdAt: { [Op.gte]: new Date(fecha_inicio) } };
  }
  const hasta = new Date(fecha_hasta);
  hasta.setDate(hasta.getDate() + 1);
  return { createdAt: { [Op.lt]: hasta } };
};

const resumenVentas = async (req, res) => {
  try {
    const whereVenta = armarWhereFecha(req);

    const data = await Venta.findAll({
      where: whereVenta,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_ventas'],
        [sequelize.fn('SUM', sequelize.col('monto_total')), 'monto_total'],
        [sequelize.fn('AVG', sequelize.col('monto_total')), 'promedio_venta'],
      ],
      raw: true,
    });

    return res.status(200).json(presentarResumenVentas(data[0]));
  } catch (err) {
    console.error('Error en resumenVentas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const productosTop = async (req, res) => {
  try {
    const { limite } = req.query;
    const whereVenta = armarWhereFecha(req);

    const ventaInclude = {
      model: Venta,
      as: 'venta',
      attributes: [],
      required: true,
    };
    if (Object.keys(whereVenta).length > 0) {
      ventaInclude.where = whereVenta;
    }

    const data = await DetalleVenta.findAll({
      attributes: [
        'producto_id',
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('cantidad')), 0), 'total_vendido'],
        [sequelize.fn('COALESCE', sequelize.fn('SUM', sequelize.col('subtotal')), 0), 'ingreso_total'],
      ],
      include: [
        { model: Producto, as: 'producto', attributes: ['nombre', 'marca'], required: true },
        ventaInclude,
      ],
      group: ['DetalleVenta.producto_id', 'producto.id', 'producto.nombre', 'producto.marca'],
      order: [[sequelize.literal('total_vendido'), 'DESC']],
      limit: parseInt(limite) || 10,
    });

    return res.status(200).json(data.map(presentarProductoTop));
  } catch (err) {
    console.error('Error en productosTop:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const ventasPorDia = async (req, res) => {
  try {
    const whereVenta = armarWhereFecha(req);

    const data = await Venta.findAll({
      where: whereVenta,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'fecha'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_ventas'],
        [sequelize.fn('SUM', sequelize.col('monto_total')), 'monto_total'],
      ],
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true,
    });

    return res.status(200).json(data.map(presentarVentasPorDia));
  } catch (err) {
    console.error('Error en ventasPorDia:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const ventasPorMetodoPago = async (req, res) => {
  try {
    const whereVenta = armarWhereFecha(req);

    const data = await Venta.findAll({
      where: whereVenta,
      attributes: [
        'metodo_pago',
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_ventas'],
        [sequelize.fn('SUM', sequelize.col('monto_total')), 'monto_total'],
      ],
      group: ['metodo_pago'],
      raw: true,
    });

    return res.status(200).json(data.map(presentarMetodoPago));
  } catch (err) {
    console.error('Error en ventasPorMetodoPago:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const stockCritico = async (req, res) => {
  try {
    const { umbral } = req.query;
    const limite = parseInt(umbral) || 5;

    const productos = await Producto.findAll({
      where: {
        stock: { [Op.lte]: limite },
        activo: true,
      },
      include: { association: 'categoria', attributes: ['id', 'nombre'] },
    });

    return res.status(200).json(
      productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        stock: p.stock,
        categoria: p.categoria
          ? { id: p.categoria.id, nombre: p.categoria.nombre }
          : null,
      }))
    );
  } catch (err) {
    console.error('Error en stockCritico:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const resumenInventario = async (req, res) => {
  try {
    const [
      total_productos,
      total_categorias,
      total_proveedores,
      productos_sin_stock,
      solicitudes_pendientes,
    ] = await Promise.all([
      Producto.count({ where: { activo: true } }),
      Categoria.count(),
      Proveedor.count({ where: { activo: true } }),
      Producto.count({ where: { stock: 0, activo: true } }),
      SolicitudReposicion.count({ where: { estado: 'Pendiente' } }),
    ]);

    return res.status(200).json({
      total_productos,
      total_categorias,
      total_proveedores,
      productos_sin_stock,
      solicitudes_pendientes,
    });
  } catch (err) {
    console.error('Error en resumenInventario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  resumenVentas,
  productosTop,
  ventasPorDia,
  ventasPorMetodoPago,
  stockCritico,
  resumenInventario,
};
