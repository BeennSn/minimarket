const { Op, QueryTypes } = require('sequelize');
const { sequelize, Venta, DetalleVenta, Producto, Categoria, Proveedor, SolicitudReposicion } = require('../models');
const {
  presentarResumenVentas,
  presentarProductoTop,
  presentarVentasPorDia,
  presentarMetodoPago,
  presentarMargenProducto,
  presentarMerma,
} = require('../presenters/reporte.presenter');
const { inicioDiaPeru, finDiaPeruExclusivo } = require('../utils/fechas');

const armarWhereFecha = (req) => {
  const { fecha_inicio, fecha_hasta } = req.query;
  if (!fecha_inicio && !fecha_hasta) return {};

  if (fecha_inicio && fecha_hasta) {
    return { createdAt: { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] } };
  }
  if (fecha_inicio) {
    return { createdAt: { [Op.gte]: inicioDiaPeru(fecha_inicio) } };
  }
  return { createdAt: { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) } };
};

const resumenVentas = async (req, res) => {
  try {
    const whereVenta = { ...armarWhereFecha(req), estado: 'Completada' };

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
    const whereVenta = { ...armarWhereFecha(req), estado: 'Completada' };

    const ventaInclude = {
      model: Venta,
      as: 'venta',
      attributes: [],
      required: true,
      where: whereVenta,
    };

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
    const whereVenta = { ...armarWhereFecha(req), estado: 'Completada' };

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
    const whereVenta = { ...armarWhereFecha(req), estado: 'Completada' };

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
        activo: true,
        [Op.and]: [
          sequelize.where(
            sequelize.col('Producto.stock'),
            Op.lte,
            sequelize.fn('COALESCE', sequelize.col('Producto.stock_minimo'), limite)
          ),
        ],
      },
      include: { association: 'categoria', attributes: ['id', 'nombre'] },
    });

    return res.status(200).json(
      productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        stock: p.stock,
        stock_minimo: p.stock_minimo ?? null,
        umbral_aplicado: p.stock_minimo ?? limite,
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

const margenProductos = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta } = req.query;

    let condicionFecha = '';
    const reemplazos = {};

    if (fecha_inicio && fecha_hasta) {
      condicionFecha = 'AND v."createdAt" >= :desde AND v."createdAt" < :hasta';
      reemplazos.desde = inicioDiaPeru(fecha_inicio);
      reemplazos.hasta = finDiaPeruExclusivo(fecha_hasta);
    } else if (fecha_inicio) {
      condicionFecha = 'AND v."createdAt" >= :desde';
      reemplazos.desde = inicioDiaPeru(fecha_inicio);
    } else if (fecha_hasta) {
      condicionFecha = 'AND v."createdAt" < :hasta';
      reemplazos.hasta = finDiaPeruExclusivo(fecha_hasta);
    }

    const sql = `
      SELECT
        p.id,
        p.nombre,
        p.marca,
        cat.nombre AS categoria,
        CAST(SUM(dv.cantidad) AS INTEGER) AS total_vendido,
        SUM(dv.subtotal) AS ingreso_total,
        SUM(cl.cantidad * em.costo_unitario) AS costo_total
      FROM detalle_ventas dv
      JOIN ventas v ON v.id = dv.venta_id
        AND v.estado = 'Completada'
        ${condicionFecha}
      JOIN consumos_lote cl ON cl.detalle_venta_id = dv.id AND cl.tipo = 'Venta'
      JOIN entradas_mercaderia em ON em.id = cl.entrada_id
        AND em.costo_unitario IS NOT NULL
      JOIN productos p ON p.id = dv.producto_id
      LEFT JOIN categorias cat ON cat.id = p.categoria_id
      GROUP BY p.id, p.nombre, p.marca, cat.nombre
      ORDER BY (SUM(dv.subtotal) - SUM(cl.cantidad * em.costo_unitario)) DESC
    `;

    const rows = await sequelize.query(sql, {
      replacements: reemplazos,
      type: QueryTypes.SELECT,
    });

    return res.status(200).json(rows.map(presentarMargenProducto));
  } catch (err) {
    console.error('Error en margenProductos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const mermasPorMotivo = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta } = req.query;

    let condicionFecha = '';
    const reemplazos = {};

    if (fecha_inicio && fecha_hasta) {
      condicionFecha = 'AND b."createdAt" >= :desde AND b."createdAt" < :hasta';
      reemplazos.desde = inicioDiaPeru(fecha_inicio);
      reemplazos.hasta = finDiaPeruExclusivo(fecha_hasta);
    } else if (fecha_inicio) {
      condicionFecha = 'AND b."createdAt" >= :desde';
      reemplazos.desde = inicioDiaPeru(fecha_inicio);
    } else if (fecha_hasta) {
      condicionFecha = 'AND b."createdAt" < :hasta';
      reemplazos.hasta = finDiaPeruExclusivo(fecha_hasta);
    }

    const sql = `
      SELECT
        b.motivo,
        CAST(COUNT(*) AS INTEGER) AS num_bajas,
        CAST(SUM(b.cantidad) AS INTEGER) AS cantidad_total,
        SUM(cl.cantidad * COALESCE(em.costo_unitario, p.costo_promedio, 0)) AS costo_valorizado
      FROM bajas_inventario b
      JOIN consumos_lote cl        ON cl.baja_id = b.id AND cl.tipo = 'Baja'
      JOIN entradas_mercaderia em  ON em.id = cl.entrada_id
      JOIN productos p             ON p.id = b.producto_id
      WHERE 1=1
        ${condicionFecha}
      GROUP BY b.motivo
      ORDER BY cantidad_total DESC
    `;

    const rows = await sequelize.query(sql, {
      replacements: reemplazos,
      type: QueryTypes.SELECT,
    });

    return res.status(200).json(rows.map(presentarMerma));
  } catch (err) {
    console.error('Error en mermasPorMotivo:', err);
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
  margenProductos,
  mermasPorMotivo,
};
