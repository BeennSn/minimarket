/**
 * producto.controller.js
 * Controlador CRUD para la gestión de productos.
 */

const { Op } = require('sequelize');
const { Producto, Categoria, Proveedor, EntradaMercaderia } = require('../models');
const { presentarProducto, presentarLista } = require('../presenters/producto.presenter');

const DIAS_MINIMOS_VENCIMIENTO = 30;

const validarFechaVencimiento = (fechaStr) => {
  if (!fechaStr) return null;
  const fecha = new Date(fechaStr + 'T00:00:00');
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaMinima = new Date(hoy);
  fechaMinima.setDate(fechaMinima.getDate() + DIAS_MINIMOS_VENCIMIENTO);
  if (isNaN(fecha.getTime())) return 'Fecha de vencimiento inválida';
  if (fecha < hoy) return 'La fecha de vencimiento no puede ser anterior a hoy';
  if (fecha < fechaMinima) return `La fecha de vencimiento debe ser al menos ${DIAS_MINIMOS_VENCIMIENTO} días a partir de hoy`;
  return null;
};

const INCLUDE = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'ruc'] },
];

// ─── Listar todos los productos ───────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const productos = await Producto.findAll({ include: INCLUDE });
    return res.status(200).json(presentarLista(productos));
  } catch (err) {
    console.error('Error en listar productos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Listar solo productos activos (para POS) ─────────────────────────────────
const listarActivos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      where: { activo: true },
      include: INCLUDE,
    });
    return res.status(200).json(presentarLista(productos));
  } catch (err) {
    console.error('Error en listar productos activos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Buscar producto por código de barras ─────────────────────────────────────
const buscarPorCodigo = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      where: { codigo_barras: req.params.codigo },
      include: INCLUDE,
    });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado para ese código de barras' });
    }
    return res.status(200).json(presentarProducto(producto));
  } catch (err) {
    console.error('Error en buscarPorCodigo:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener un producto por ID ───────────────────────────────────────────────
const obtener = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: INCLUDE,
    });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    return res.status(200).json(presentarProducto(producto));
  } catch (err) {
    console.error('Error en obtener producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Crear un nuevo producto ──────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { nombre, marca, categoria_id, proveedor_id, precio, stock, codigo_barras, fecha_vencimiento } = req.body;

    const errorFecha = validarFechaVencimiento(fecha_vencimiento);
    if (errorFecha) return res.status(400).json({ mensaje: errorFecha });

    if (codigo_barras) {
      const existe = await Producto.findOne({ where: { codigo_barras } });
      if (existe) {
        return res.status(400).json({ mensaje: 'El código de barras ya está registrado en otro producto' });
      }
    }

    // Verificar que la categoría exista
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    // Verificar que el proveedor exista
    if (proveedor_id) {
      const proveedor = await Proveedor.findByPk(proveedor_id);
      if (!proveedor) {
        return res.status(400).json({ mensaje: 'Proveedor no encontrado' });
      }
    }

    const fvDefecto = new Date();
    fvDefecto.setFullYear(fvDefecto.getFullYear() + 2);

    const nuevo = await Producto.create({
      nombre,
      marca,
      categoria_id,
      proveedor_id: proveedor_id || null,
      precio,
      stock: stock || 0,
      codigo_barras: codigo_barras || null,
      fecha_vencimiento: fecha_vencimiento || fvDefecto.toISOString().split('T')[0],
      activo: true,
    });

    const productoCreado = await Producto.findByPk(nuevo.id, { include: INCLUDE });
    return res.status(201).json(presentarProducto(productoCreado));
  } catch (err) {
    console.error('Error en crear producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Actualizar un producto ───────────────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const { nombre, marca, categoria_id, proveedor_id, precio, codigo_barras, fecha_vencimiento } = req.body;

    if (fecha_vencimiento !== undefined) {
      const errorFecha = validarFechaVencimiento(fecha_vencimiento);
      if (errorFecha) return res.status(400).json({ mensaje: errorFecha });
    }

    if (codigo_barras !== undefined) {
      const existe = await Producto.findOne({ where: { codigo_barras, id: { [Op.ne]: producto.id } } });
      if (existe) {
        return res.status(400).json({ mensaje: 'El código de barras ya está registrado en otro producto' });
      }
    }

    // Verificar que la categoría exista (si se proporciona)
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    // Verificar que el proveedor exista (si se proporciona)
    if (proveedor_id !== undefined) {
      if (proveedor_id) {
        const proveedor = await Proveedor.findByPk(proveedor_id);
        if (!proveedor) {
          return res.status(400).json({ mensaje: 'Proveedor no encontrado' });
        }
      }
      producto.proveedor_id = proveedor_id || null;
    }

    // Actualizar solo los campos recibidos
    if (nombre !== undefined) producto.nombre = nombre;
    if (marca !== undefined) producto.marca = marca;
    if (categoria_id !== undefined) producto.categoria_id = categoria_id;
    if (precio !== undefined) producto.precio = precio;
    if (codigo_barras !== undefined) producto.codigo_barras = codigo_barras || null;
    if (fecha_vencimiento !== undefined) producto.fecha_vencimiento = fecha_vencimiento || null;

    await producto.save();

    const productoActualizado = await Producto.findByPk(producto.id, { include: INCLUDE });
    return res.status(200).json(presentarProducto(productoActualizado));
  } catch (err) {
    console.error('Error en actualizar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Desactivar un producto (soft delete) ─────────────────────────────────────
const desactivar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await producto.update({ activo: false });
    return res.status(200).json({ mensaje: 'Producto desactivado' });
  } catch (err) {
    console.error('Error en desactivar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Reactivar un producto ────────────────────────────────────────────────────
const reactivar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await producto.update({ activo: true });
    return res.status(200).json({ mensaje: 'Producto reactivado' });
  } catch (err) {
    console.error('Error en reactivar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Productos próximos a vencer ──────────────────────────────────────────────
const listarProximosVencer = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 30;
    const hoy = new Date();
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(fechaLimite.getDate() + dias);

    const entradas = await EntradaMercaderia.findAll({
      where: {
        fecha_vencimiento: { [Op.ne]: null },
      },
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
      ],
    });

    const vencidos = [];
    const porVencer = [];
    const mapa = {};

    for (const e of entradas) {
      const fv = new Date(e.fecha_vencimiento);
      if (!mapa[e.producto_id]) {
        mapa[e.producto_id] = {
          id: e.producto.id,
          nombre: e.producto.nombre,
          marca: e.producto.marca,
          stock_vencido: 0,
          stock_por_vencer: 0,
          proxima_fecha: null,
        };
      }
      if (fv < hoy) {
        mapa[e.producto_id].stock_vencido += e.cantidad;
      } else if (fv <= fechaLimite) {
        mapa[e.producto_id].stock_por_vencer += e.cantidad;
        const d = fv.toISOString().split('T')[0];
        if (!mapa[e.producto_id].proxima_fecha || d < mapa[e.producto_id].proxima_fecha) {
          mapa[e.producto_id].proxima_fecha = d;
        }
      }
    }

    const resultado = Object.values(mapa);
    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error en listarProximosVencer:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listar, listarActivos, buscarPorCodigo, obtener, crear, actualizar, desactivar, reactivar, listarProximosVencer };
