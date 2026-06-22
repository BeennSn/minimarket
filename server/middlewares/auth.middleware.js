/**
 * auth.middleware.js
 * Middlewares de autenticación y autorización por rol.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifica que la petición incluya un JWT válido en el header
 * Authorization: Bearer <token>
 * Si es válido, guarda el payload en req.usuario y llama a next().
 */
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ mensaje: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;
    next();
  } catch (err) {
    return res.status(401).json({ mensaje: 'Token inválido o expirado' });
  }
};

/**
 * Fábrica de middleware de autorización por rol.
 * Uso: verificarRol('Administrador', 'Gerente')
 * @param {...string} roles - Roles permitidos
 * @returns {Function} Middleware Express
 */
const verificarRol = (...roles) => (req, res, next) => {
  if (!roles.includes(req.usuario?.rol)) {
    return res.status(403).json({ mensaje: 'Acceso no autorizado' });
  }
  next();
};

module.exports = { verificarToken, verificarRol };
