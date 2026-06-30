const bcrypt = require('bcryptjs');
const { Op }  = require('sequelize');

const { Usuario }                          = require('../models');
const { presentarUsuario, presentarLista } = require('../presenters/usuario.presenter');
const { validatePassword }                 = require('./auth.controller');

const ROLES_VALIDOS = ['Administrador', 'Vendedor', 'Almacenero', 'Gerente'];

// ─── Listar todos los usuarios ────────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll();
    return res.status(200).json(presentarLista(usuarios));
  } catch (err) {
    console.error('Error en listar usuarios:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener un usuario por ID ────────────────────────────────────────────────
const obtener = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    return res.status(200).json(presentarUsuario(usuario));
  } catch (err) {
    console.error('Error en obtener usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Crear usuario ────────────────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ mensaje: 'El nombre es requerido' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ mensaje: 'El email no es válido' });
    }
    if (!password) {
      return res.status(400).json({ mensaje: 'La contraseña es requerida' });
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ mensaje: `Contraseña inválida: ${passwordError}` });
    }
    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ mensaje: `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }

    // Verificar email duplicado
    const existe = await Usuario.findOne({ where: { email } });
    if (existe) {
      return res.status(400).json({ mensaje: 'El email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const nuevo = await Usuario.create({
      nombre,
      email,
      password_hash,
      rol,
      activo: true,
    });

    return res.status(201).json(presentarUsuario(nuevo));
  } catch (err) {
    console.error('Error en crear usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Actualizar usuario ───────────────────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { nombre, email, rol } = req.body;

    if (email !== undefined && email !== usuario.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ mensaje: 'El email no es válido' });
      }
      const emailEnUso = await Usuario.findOne({ where: { email, id: { [Op.ne]: usuario.id } } });
      if (emailEnUso) {
        return res.status(400).json({ mensaje: 'El email ya está en uso por otro usuario' });
      }
    }

    if (rol !== undefined && !ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ mensaje: `El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}` });
    }

    // Actualizar solo los campos que vienen en el body
    if (nombre !== undefined) usuario.nombre = nombre;
    if (email  !== undefined) usuario.email  = email;
    if (rol    !== undefined) usuario.rol    = rol;

    await usuario.save();

    return res.status(200).json(presentarUsuario(usuario));
  } catch (err) {
    console.error('Error en actualizar usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Cambiar contraseña (usuario autenticado, solo la propia) ─────────────────
const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    // El usuario viene del token (req.usuario.id inyectado por verificarToken)
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const passwordValida = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
    }

    usuario.password_hash = await bcrypt.hash(password_nueva, 10);
    await usuario.save();

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en cambiarPassword:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Desactivar usuario (soft delete) ────────────────────────────────────────
const desactivar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.activo = false;
    await usuario.save();

    return res.status(200).json({ mensaje: 'Usuario desactivado' });
  } catch (err) {
    console.error('Error en desactivar usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Reactivar usuario ────────────────────────────────────────────────────────
const reactivar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    usuario.activo = true;
    await usuario.save();

    return res.status(200).json({ mensaje: 'Usuario reactivado' });
  } catch (err) {
    console.error('Error en reactivar usuario:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  cambiarPassword,
  desactivar,
  reactivar,
};
