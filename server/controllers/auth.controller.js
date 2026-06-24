const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const { Usuario, LogAcceso } = require('../models');
const { presentarLogin }     = require('../presenters/auth.presenter');
const { enviarCorreo } = require('../services/mail.service');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await LogAcceso.create({
      usuario_id:     usuario.id,
      nombre_usuario: usuario.nombre,
      rol:            usuario.rol,
      fecha_hora:     new Date(),
    });

    return res.status(200).json(presentarLogin(token, usuario));
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const logout = (req, res) => {
  return res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
};

// ─── Reset de contraseña ─────────────────────────────────────────────────────

const validatePassword = (password) => {
  if (password.length < 7) return 'Debe tener al menos 7 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener una mayúscula';
  if (!/[a-z]/.test(password)) return 'Debe contener una minúscula';
  if (!/\d/.test(password)) return 'Debe contener un dígito';
  return null;
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const respuesta = { mensaje: 'Si el correo existe recibirás las instrucciones' };

    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(200).json(respuesta);
    }

    const codigo = Math.floor(1000 + Math.random() * 9000).toString();
    usuario.reset_code = codigo;
    usuario.reset_expiry = new Date(Date.now() + 15 * 60 * 1000);
    usuario.reset_used = false;
    await usuario.save();

    try {
      await enviarCorreo({
        para: email,
        asunto: 'Código de recuperación - Minimarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Recuperación de contraseña</h2>
            <p>Usa el siguiente código para restablecer tu contraseña:</p>
            <div style="font-size: 36px; font-family: monospace; letter-spacing: 8px; color: #6366f1; text-align: center; padding: 16px; background: #f5f3ff; border-radius: 8px; margin: 16px 0;">
              ${codigo}
            </div>
            <p style="color: #666;">Este código expirará en <strong>15 minutos</strong>.</p>
            <p style="color: #999; font-size: 12px;">Si no solicitaste este cambio, ignora este mensaje.</p>
          </div>
        `,
      });
    } catch {
      return res.status(500).json({ mensaje: 'Error al enviar el correo' });
    }

    await LogAcceso.create({
      usuario_id: usuario.id,
      nombre_usuario: usuario.nombre,
      rol: usuario.rol,
      fecha_hora: new Date(),
      detalle: 'Solicitud de código de recuperación',
    });

    return res.status(200).json(respuesta);
  } catch (err) {
    console.error('Error en forgotPassword:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { codigo, password_nueva } = req.body;

    if (!/^\d{4}$/.test(codigo)) {
      return res.status(400).json({ mensaje: 'El código debe tener exactamente 4 dígitos' });
    }

    const passwordError = validatePassword(password_nueva);
    if (passwordError) {
      return res.status(400).json({ mensaje: `Contraseña inválida: ${passwordError}` });
    }

    const usuario = await Usuario.findOne({ where: { email, activo: true } });
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado' });
    }

    if (usuario.reset_code !== codigo) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado' });
    }

    if (usuario.reset_used) {
      return res.status(400).json({ mensaje: 'Este código ya fue utilizado' });
    }

    if (!usuario.reset_expiry || new Date() > usuario.reset_expiry) {
      return res.status(400).json({ mensaje: 'El código ha expirado' });
    }

    const mismaPassword = await bcrypt.compare(password_nueva, usuario.password_hash);
    if (mismaPassword) {
      return res.status(400).json({ mensaje: 'La nueva contraseña debe ser diferente a la actual' });
    }

    usuario.password_hash = await bcrypt.hash(password_nueva, 10);
    usuario.reset_code = null;
    usuario.reset_expiry = null;
    usuario.reset_used = false;
    usuario.intentos_fallidos = 0;
    usuario.bloqueo_hasta = null;
    await usuario.save();

    await LogAcceso.create({
      usuario_id:     usuario.id,
      nombre_usuario: usuario.nombre,
      rol:            usuario.rol,
      fecha_hora:     new Date(),
      detalle: 'Contraseña restablecida exitosamente via codigo',
    });

    return res.status(200).json({ success: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { login, logout, forgotPassword, resetPassword };
