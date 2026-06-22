/**
 * auth.controller.js
 * Controlador de autenticación: login y logout.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const { Usuario, LogAcceso } = require('../models');
const { presentarLogin }     = require('../presenters/auth.presenter');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * Autentica al usuario y devuelve un JWT junto con los datos públicos del usuario.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar usuario activo
    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // 2. Comparar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // 3. Generar JWT
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 4. Registrar log de acceso
    await LogAcceso.create({
      usuario_id:     usuario.id,
      nombre_usuario: usuario.nombre,
      rol:            usuario.rol,
      fecha_hora:     new Date(),
    });

    // 5. Responder
    return res.status(200).json(presentarLogin(token, usuario));
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/logout
 * Cierra la sesión del usuario (el cliente debe eliminar el token localmente).
 */
const logout = (req, res) => {
  return res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
};

// ─── Reset de contraseña ─────────────────────────────────────────────────────

const { enviarCorreo } = require('../services/mail.service');

/**
 * POST /api/auth/reset/solicitar
 * Genera un código de 6 dígitos y lo envía por correo si el email existe.
 */
const solicitarReset = async (req, res) => {
  try {
    const { email } = req.body;
    const respuesta = { mensaje: 'Si el correo existe recibirás las instrucciones' };

    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(200).json(respuesta);
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    usuario.reset_code = codigo;
    usuario.reset_expiry = new Date(Date.now() + 15 * 60 * 1000);
    await usuario.save();

    try {
      await enviarCorreo({
        para: email,
        asunto: 'Código de recuperación - Minimarket',
        html: `
          <h2>Recuperación de contraseña</h2>
          <p>Tu código de verificación es:</p>
          <h1 style="color: #2563eb; letter-spacing: 8px;">${codigo}</h1>
          <p>Este código expira en <strong>15 minutos</strong>.</p>
          <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        `,
      });
    } catch {
      return res.status(500).json({ mensaje: 'Error al enviar el correo' });
    }

    return res.status(200).json(respuesta);
  } catch (err) {
    console.error('Error en solicitarReset:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/reset/confirmar
 * Valida el código y actualiza la contraseña.
 */
const confirmarReset = async (req, res) => {
  try {
    const { email, codigo, password_nueva } = req.body;

    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado' });
    }

    if (usuario.reset_code !== codigo || new Date() > usuario.reset_expiry) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado' });
    }

    usuario.password_hash = await bcrypt.hash(password_nueva, 10);
    usuario.reset_code = null;
    usuario.reset_expiry = null;
    await usuario.save();

    return res.status(200).json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en confirmarReset:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { login, logout, solicitarReset, confirmarReset };
