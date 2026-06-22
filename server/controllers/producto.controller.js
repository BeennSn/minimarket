/**
 * producto.controller.js
 * Controlador CRUD para la gestión de productos.
 */

const { Producto, Categoria } = require('../models');
const { presentarProducto, presentarLista } = require('../presenters/producto.presenter');

// ─── Listar todos los productos ───────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
    });
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
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
    });
    return res.status(200).json(presentarLista(productos));
  } catch (err) {
    console.error('Error en listar productos activos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener un producto por ID ───────────────────────────────────────────────
const obtener = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
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
    const { nombre, marca, categoria_id, precio, stock } = req.body;

    // Verificar que la categoría exista
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    const nuevo = await Producto.create({
      nombre,
      marca,
      categoria_id,
      precio,
      stock: stock || 0,
      activo: true,
    });

    const productoConCategoria = await Producto.findByPk(nuevo.id, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
    });

    return res.status(201).json(presentarProducto(productoConCategoria));
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

    const { nombre, marca, categoria_id, precio } = req.body;

    // Verificar que la categoría exista (si se proporciona)
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    // Actualizar solo los campos recibidos
    if (nombre !== undefined) producto.nombre = nombre;
    if (marca !== undefined) producto.marca = marca;
    if (categoria_id !== undefined) producto.categoria_id = categoria_id;
    if (precio !== undefined) producto.precio = precio;

    await producto.save();

    const productoConCategoria = await Producto.findByPk(producto.id, {
      include: [{ model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] }],
    });

    return res.status(200).json(presentarProducto(productoConCategoria));
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

module.exports = { listar, listarActivos, obtener, crear, actualizar, desactivar, reactivar };
