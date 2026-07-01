/**
 * auth.middleware.js
 * Middlewares de autenticación y autorización por rol.
 */

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

const MENSAJES_MOTIVO = {
  'Nueva sesion': 'Se inició sesión con esta cuenta en otro dispositivo o pestaña. Tu sesión se cerró.',
  'Cambio de contraseña': 'La contraseña de tu cuenta fue cambiada. Vuelve a iniciar sesión.',
  'Cierre forzado por SuperAdmin': 'Un SuperAdmin cerró tu sesión.',
};

/**
 * Verifica que la petición incluya un JWT válido en el header
 * Authorization: Bearer <token>. Además de la firma, valida contra la BD que
 * la cuenta siga activa y que `session_version` coincida con la del token —
 * así, cambiar la contraseña o forzar el cierre de sesión (ver
 * usuario.controller.js → forzarCierreSesion) invalida el token de inmediato
 * en vez de esperar a que expire por sí solo.
 * Si es válido, guarda { id, rol } (rol siempre leído en vivo de la BD) en
 * req.usuario y llama a next().
 */
const verificarToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const usuario = await Usuario.findByPk(payload.id, {
      attributes: ['id', 'rol', 'activo', 'session_version', 'motivo_sesion_cerrada'],
    });

    if (!usuario) {
      return res.status(401).json({ mensaje: 'Token inválido o expirado', motivo: 'token_invalido' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ mensaje: 'Tu cuenta ha sido desactivada.', motivo: 'cuenta_desactivada' });
    }

    if (usuario.session_version !== payload.sv) {
      const mensaje = MENSAJES_MOTIVO[usuario.motivo_sesion_cerrada] || 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
      return res.status(401).json({ mensaje, motivo: 'sesion_cerrada' });
    }

    req.usuario = { id: usuario.id, rol: usuario.rol };
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

/**
 * Fábrica de middleware de autorización por rol.
 * Uso: verificarRol('Administrador', 'Gerente')
 * 'SuperAdmin' siempre satisface cualquier lista que incluya 'Administrador'
 * (tiene todo el acceso de Administrador, más la gestión exclusiva de usuarios).
 * @param {...string} roles - Roles permitidos
 * @returns {Function} Middleware Express
 */
const verificarRol = (...roles) => (req, res, next) => {
  const rol = req.usuario?.rol;
  const autorizado = roles.includes(rol) || (rol === 'SuperAdmin' && roles.includes('Administrador'));
  if (!autorizado) {
    return res.status(403).json({ mensaje: 'Acceso no autorizado' });
  }
  next();
};

module.exports = { verificarToken, verificarRol };
