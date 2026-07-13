const { Op } = require('sequelize');
const { Proveedor } = require('../models');
const { presentarProveedor, presentarLista } = require('../presenters/proveedor.presenter');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^\+?\d{6,15}$/;

// Valida que el contacto, si se envía, sea un correo o un teléfono con formato válido.
function contactoInvalido(contacto) {
  if (contacto == null) return false;
  const v = String(contacto).trim();
  if (!v) return false;
  if (v.includes('@')) return !EMAIL_REGEX.test(v);
  return !TELEFONO_REGEX.test(v.replace(/[\s-]/g, ''));
}

const listar = async (req, res) => {
  try {
    const { soloActivos } = req.query;
    const where = soloActivos === 'true' ? { activo: true } : {};
    const proveedores = await Proveedor.findAll({ where, order: [['nombre', 'ASC']] });
    return res.status(200).json(presentarLista(proveedores));
  } catch (err) {
    console.error('Error en listar proveedores:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtener = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }
    return res.status(200).json(presentarProveedor(proveedor));
  } catch (err) {
    console.error('Error en obtener proveedor:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const crear = async (req, res) => {
  try {
    const { nombre, ruc, contacto } = req.body;

    if (!/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ mensaje: 'El RUC debe tener 11 dígitos' });
    }

    if (ruc.startsWith('10')) {
      return res.status(400).json({ mensaje: 'RUC de persona natural (10) no válido para proveedor; debe ser RUC de empresa (20)' });
    }

    if (contactoInvalido(contacto)) {
      return res.status(400).json({ mensaje: 'El contacto debe ser un teléfono o correo electrónico válido' });
    }

    const porRuc = await Proveedor.findOne({ where: { ruc } });
    if (porRuc) {
      return res.status(400).json({ mensaje: 'El RUC ya está registrado' });
    }

    const porNombre = await Proveedor.findOne({ where: { nombre: nombre?.trim() } });
    if (porNombre) {
      return res.status(400).json({ mensaje: 'Ya existe un proveedor con ese nombre' });
    }

    const nuevo = await Proveedor.create({ nombre, ruc, contacto, activo: true });
    return res.status(201).json(presentarProveedor(nuevo));
  } catch (err) {
    console.error('Error en crear proveedor:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const actualizar = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }

    const { nombre, ruc, contacto } = req.body;

    if (contactoInvalido(contacto)) {
      return res.status(400).json({ mensaje: 'El contacto debe ser un teléfono o correo electrónico válido' });
    }

    if (ruc !== undefined && ruc !== proveedor.ruc) {
      if (!/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ mensaje: 'El RUC debe tener 11 dígitos' });
      }
      if (ruc.startsWith('10')) {
        return res.status(400).json({ mensaje: 'RUC de persona natural (10) no válido para proveedor; debe ser RUC de empresa (20)' });
      }
      const existe = await Proveedor.findOne({ where: { ruc, id: { [Op.ne]: proveedor.id } } });
      if (existe) {
        return res.status(400).json({ mensaje: 'El RUC ya está registrado' });
      }
      proveedor.ruc = ruc;
    }

    if (nombre !== undefined && nombre.trim() !== proveedor.nombre) {
      const porNombre = await Proveedor.findOne({ where: { nombre: nombre.trim(), id: { [Op.ne]: proveedor.id } } });
      if (porNombre) {
        return res.status(400).json({ mensaje: 'Ya existe un proveedor con ese nombre' });
      }
      proveedor.nombre = nombre.trim();
    }
    if (contacto !== undefined) proveedor.contacto = contacto;

    await proveedor.save();
    return res.status(200).json(presentarProveedor(proveedor));
  } catch (err) {
    console.error('Error en actualizar proveedor:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const desactivar = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }
    proveedor.activo = false;
    await proveedor.save();
    return res.status(200).json({ mensaje: 'Proveedor desactivado' });
  } catch (err) {
    console.error('Error en desactivar proveedor:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const reactivar = async (req, res) => {
  try {
    const proveedor = await Proveedor.findByPk(req.params.id);
    if (!proveedor) {
      return res.status(404).json({ mensaje: 'Proveedor no encontrado' });
    }
    proveedor.activo = true;
    await proveedor.save();
    return res.status(200).json({ mensaje: 'Proveedor reactivado' });
  } catch (err) {
    console.error('Error en reactivar proveedor:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  desactivar,
  reactivar,
};
