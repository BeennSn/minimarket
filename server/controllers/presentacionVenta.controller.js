/**
 * presentacionVenta.controller.js
 * CRUD de presentaciones de venta (unidad de venta) de un producto: cada
 * producto puede venderse en varias presentaciones (Unidad, Media docena,
 * Docena, Paquete, Caja, ...), cada una con su propio factor de conversión
 * a unidades base y su propio precio.
 */

const { Op } = require('sequelize');
const { sequelize, Producto, PresentacionVenta } = require('../models');
const { presentarPresentacion } = require('../presenters/presentacionVenta.presenter');
const { sincronizarPrecioProducto } = require('../services/presentacionVenta.service');

const validarCamposComunes = ({ nombre, factor_conversion, precio, esCreacion }) => {
  if (esCreacion && (!nombre || !nombre.trim())) {
    return 'El nombre de la presentación es requerido';
  }
  if (factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== '' &&
      (isNaN(parseInt(factor_conversion, 10)) || parseInt(factor_conversion, 10) < 1)) {
    return 'El factor de conversión debe ser al menos 1';
  }
  if (esCreacion && (precio === undefined || precio === null || parseFloat(precio) <= 0)) {
    return 'El precio debe ser mayor a 0';
  }
  if (!esCreacion && precio !== undefined && precio !== null && parseFloat(precio) <= 0) {
    return 'El precio debe ser mayor a 0';
  }
  return null;
};

// ─── Crear una presentación de venta ──────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const { nombre, factor_conversion, precio, es_default } = req.body;

    const errorCampos = validarCamposComunes({ nombre, factor_conversion, precio, esCreacion: true });
    if (errorCampos) {
      return res.status(400).json({ mensaje: errorCampos });
    }

    const factorFinal = factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== ''
      ? parseInt(factor_conversion, 10)
      : 1;
    const esDefaultFinal = !!es_default;

    if (esDefaultFinal && factorFinal !== 1) {
      return res.status(400).json({ mensaje: 'La presentación predeterminada debe tener factor de conversión 1' });
    }

    const nombreLimpio = nombre.trim();
    const duplicado = await PresentacionVenta.findOne({
      where: { producto_id: producto.id, nombre: { [Op.iLike]: nombreLimpio } },
    });
    if (duplicado) {
      return res.status(400).json({ mensaje: 'Ya existe una presentación con ese nombre para este producto' });
    }

    const presentacionCreada = await sequelize.transaction(async (t) => {
      if (esDefaultFinal) {
        await PresentacionVenta.update(
          { es_default: false },
          { where: { producto_id: producto.id, es_default: true }, transaction: t }
        );
      }

      const nueva = await PresentacionVenta.create({
        producto_id: producto.id,
        nombre: nombreLimpio,
        factor_conversion: factorFinal,
        precio: parseFloat(precio),
        es_default: esDefaultFinal,
        activo: true,
      }, { transaction: t });

      if (esDefaultFinal) {
        await sincronizarPrecioProducto(producto, t);
      }

      return nueva;
    });

    return res.status(201).json(presentarPresentacion(presentacionCreada));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en crear presentación de venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Actualizar una presentación de venta ─────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const presentacion = await PresentacionVenta.findOne({
      where: { id: req.params.presentacionId, producto_id: req.params.id },
    });
    if (!presentacion) {
      return res.status(404).json({ mensaje: 'Presentación de venta no encontrada' });
    }

    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const { nombre, factor_conversion, precio, es_default } = req.body;

    const errorCampos = validarCamposComunes({ nombre, factor_conversion, precio, esCreacion: false });
    if (errorCampos) {
      return res.status(400).json({ mensaje: errorCampos });
    }

    const factorFinal = factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== ''
      ? parseInt(factor_conversion, 10)
      : presentacion.factor_conversion;
    const esDefaultFinal = es_default !== undefined ? !!es_default : presentacion.es_default;

    if (esDefaultFinal && factorFinal !== 1) {
      return res.status(400).json({ mensaje: 'La presentación predeterminada debe tener factor de conversión 1' });
    }

    if (nombre !== undefined) {
      const nombreLimpio = nombre.trim();
      if (!nombreLimpio) {
        return res.status(400).json({ mensaje: 'El nombre de la presentación es requerido' });
      }
      const duplicado = await PresentacionVenta.findOne({
        where: {
          producto_id: presentacion.producto_id,
          nombre: { [Op.iLike]: nombreLimpio },
          id: { [Op.ne]: presentacion.id },
        },
      });
      if (duplicado) {
        return res.status(400).json({ mensaje: 'Ya existe una presentación con ese nombre para este producto' });
      }
    }

    await sequelize.transaction(async (t) => {
      // Si esta pasa a ser la default, la anterior deja de serlo.
      if (esDefaultFinal && !presentacion.es_default) {
        await PresentacionVenta.update(
          { es_default: false },
          { where: { producto_id: presentacion.producto_id, es_default: true }, transaction: t }
        );
      }
      // Si esta ERA la default y deja de serlo, exige que ya exista otra
      // marcada como default (no puede quedar el producto sin ninguna).
      if (!esDefaultFinal && presentacion.es_default) {
        throw { status: 400, mensaje: 'Marca otra presentación como predeterminada antes de quitarle esta condición' };
      }

      if (nombre !== undefined) presentacion.nombre = nombre.trim();
      presentacion.factor_conversion = factorFinal;
      if (precio !== undefined && precio !== null && precio !== '') presentacion.precio = parseFloat(precio);
      presentacion.es_default = esDefaultFinal;
      await presentacion.save({ transaction: t });

      if (esDefaultFinal) {
        await sincronizarPrecioProducto(producto, t);
      }
    });

    return res.status(200).json(presentarPresentacion(presentacion));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en actualizar presentación de venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Desactivar una presentación de venta ─────────────────────────────────────
const desactivar = async (req, res) => {
  try {
    const presentacion = await PresentacionVenta.findOne({
      where: { id: req.params.presentacionId, producto_id: req.params.id },
    });
    if (!presentacion) {
      return res.status(404).json({ mensaje: 'Presentación de venta no encontrada' });
    }

    if (presentacion.es_default) {
      return res.status(400).json({ mensaje: 'No se puede desactivar la presentación predeterminada. Marca otra como predeterminada primero.' });
    }

    const activasRestantes = await PresentacionVenta.count({
      where: { producto_id: presentacion.producto_id, activo: true, id: { [Op.ne]: presentacion.id } },
    });
    if (activasRestantes === 0) {
      return res.status(400).json({ mensaje: 'El producto debe tener al menos una presentación de venta activa' });
    }

    presentacion.activo = false;
    await presentacion.save();

    return res.status(200).json(presentarPresentacion(presentacion));
  } catch (err) {
    console.error('Error en desactivar presentación de venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Reactivar una presentación de venta ──────────────────────────────────────
const reactivar = async (req, res) => {
  try {
    const presentacion = await PresentacionVenta.findOne({
      where: { id: req.params.presentacionId, producto_id: req.params.id },
    });
    if (!presentacion) {
      return res.status(404).json({ mensaje: 'Presentación de venta no encontrada' });
    }

    presentacion.activo = true;
    await presentacion.save();

    return res.status(200).json(presentarPresentacion(presentacion));
  } catch (err) {
    console.error('Error en reactivar presentación de venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { crear, actualizar, desactivar, reactivar };
