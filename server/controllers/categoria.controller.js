/**
 * categoria.controller.js
 * Controlador CRUD para la gestión de categorías.
 */

const { Categoria, Producto } = require('../models');
const { presentarCategoria, presentarLista } = require('../presenters/categoria.presenter');

// ─── Listar todas las categorías ──────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const categorias = await Categoria.findAll();
    return res.status(200).json(presentarLista(categorias));
  } catch (err) {
    console.error('Error en listar categorías:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Crear una nueva categoría ────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { nombre } = req.body;

    // Verificar que la categoría no exista
    const existe = await Categoria.findOne({ where: { nombre } });
    if (existe) {
      return res.status(400).json({ mensaje: 'La categoría ya existe' });
    }

    const nueva = await Categoria.create({ nombre });
    return res.status(201).json(presentarCategoria(nueva));
  } catch (err) {
    console.error('Error en crear categoría:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Actualizar una categoría ─────────────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }

    const { nombre } = req.body;
    await categoria.update({ nombre });
    return res.status(200).json(presentarCategoria(categoria));
  } catch (err) {
    console.error('Error en actualizar categoría:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Eliminar una categoría ───────────────────────────────────────────────────
const eliminar = async (req, res) => {
  try {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) {
      return res.status(404).json({ mensaje: 'Categoría no encontrada' });
    }

    // Verificar que no tenga productos asociados
    const productoCount = await Producto.count({
      where: { categoria_id: req.params.id },
    });

    if (productoCount > 0) {
      return res.status(400).json({ mensaje: 'No se puede eliminar, tiene productos asociados' });
    }

    await categoria.destroy();
    return res.status(200).json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    console.error('Error en eliminar categoría:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listar, crear, actualizar, eliminar };
