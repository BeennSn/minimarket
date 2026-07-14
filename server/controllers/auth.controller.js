const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { Op } = require('sequelize');

const { Usuario, LogAcceso } = require('../models');
const { presentarLogin, presentarUsuario } = require('../presenters/auth.presenter');
const { enviarCorreo } = require('../services/mail.service');

const JWT_SECRET     = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const INTENTOS_MAX     = 5;
const BLOQUEO_MINUTOS  = 15;

const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.trim();

    // Búsqueda insensible a mayúsculas/minúsculas: si la cuenta se creó como
    // "Marlon@Gmail.com", debe poder loguearse igual con "marlon@gmail.com".
    const usuario = email
      ? await Usuario.findOne({ where: { email: { [Op.iLike]: email }, activo: true } })
      : null;
    if (!usuario) {
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    if (usuario.bloqueo_hasta && new Date() < new Date(usuario.bloqueo_hasta)) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueo_hasta) - new Date()) / 60000);
      return res.status(401).json({
        mensaje: `Cuenta bloqueada temporalmente. Intente en ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}.`,
      });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;
      if (usuario.intentos_fallidos >= INTENTOS_MAX) {
        usuario.bloqueo_hasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000);
        usuario.intentos_fallidos = 0;
      }
      await usuario.save();
      return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    // Solo una sesión activa a la vez: si ya hay una, se cierra automáticamente
    // (sube session_version, invalidando el token anterior) y se permite el
    // nuevo login, en vez de rechazarlo.
    if (usuario.sesion_activa) {
      usuario.motivo_sesion_cerrada = 'Nuevo inicio de sesión en otro dispositivo';
      usuario.session_version = (usuario.session_version || 0) + 1;
      await LogAcceso.create({
        usuario_id:     usuario.id,
        nombre_usuario: usuario.nombre,
        rol:            usuario.rol,
        tipo:           'Logout',
        fecha_hora:     new Date(),
        detalle: 'Sesión anterior cerrada automáticamente por nuevo inicio de sesión',
      });
    }

    usuario.intentos_fallidos = 0;
    usuario.bloqueo_hasta = null;
    usuario.sesion_activa = true;
    await usuario.save();

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, sv: usuario.session_version },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await LogAcceso.create({
      usuario_id:     usuario.id,
      nombre_usuario: usuario.nombre,
      rol:            usuario.rol,
      tipo:           'Login',
      fecha_hora:     new Date(),
    });

    return res.status(200).json(presentarLogin(token, usuario));
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const logout = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (usuario) {
      usuario.sesion_activa = false;
      await usuario.save();

      await LogAcceso.create({
        usuario_id:     usuario.id,
        nombre_usuario: usuario.nombre,
        rol:            usuario.rol,
        tipo:           'Logout',
        fecha_hora:     new Date(),
      });
    }
    return res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (err) {
    console.error('Error en logout:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Endpoint liviano usado por el frontend (heartbeat) para detectar, sin esperar
// a la próxima acción del usuario, que la sesión fue invalidada (cuenta
// desactivada, cambio de contraseña, cierre forzado o login en otro lugar).
const me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    return res.status(200).json(presentarUsuario(usuario));
  } catch (err) {
    console.error('Error en me:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Reset de contraseña ─────────────────────────────────────────────────────

const validatePassword = (password) => {
  if (password.length < 7) return 'Debe tener al menos 7 caracteres';
  if (!/[A-Z]/.test(password)) return 'Debe contener una mayúscula';
  if (!/[a-z]/.test(password)) return 'Debe contener una minúscula';
  if (!/\d/.test(password)) return 'Debe contener un dígito';
  return null;
};

// Mismo mensaje y status (200) exista o no la cuenta: revelar la diferencia
// (como hacía antes con un 404 aparte) permite enumerar qué correos están
// registrados probando contra este endpoint, sin necesitar contraseña —
// login() ya evita esto mismo con "Credenciales incorrectas" genérico.
const MSG_FORGOT_PASSWORD = 'Si el correo está registrado, se envió un código de recuperación.';

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim();

    const usuario = email
      ? await Usuario.findOne({ where: { email: { [Op.iLike]: email }, activo: true } })
      : null;
    if (!usuario) {
      return res.status(200).json({ mensaje: MSG_FORGOT_PASSWORD });
    }

    const codigo = Math.floor(1000 + Math.random() * 9000).toString();

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

    usuario.reset_code = codigo;
    usuario.reset_expiry = new Date(Date.now() + 15 * 60 * 1000);
    usuario.reset_used = false;
    await usuario.save();

    await LogAcceso.create({
      usuario_id: usuario.id,
      nombre_usuario: usuario.nombre,
      rol: usuario.rol,
      tipo: 'Otro',
      fecha_hora: new Date(),
      detalle: 'Solicitud de código de recuperación',
    });

    return res.status(200).json({ mensaje: MSG_FORGOT_PASSWORD });
  } catch (err) {
    console.error('Error en forgotPassword:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim();
    const { codigo, password_nueva } = req.body;

    if (!/^\d{4}$/.test(codigo)) {
      return res.status(400).json({ mensaje: 'El código debe tener exactamente 4 dígitos' });
    }

    const passwordError = validatePassword(password_nueva);
    if (passwordError) {
      return res.status(400).json({ mensaje: `Contraseña inválida: ${passwordError}` });
    }

    const usuario = email
      ? await Usuario.findOne({ where: { email: { [Op.iLike]: email }, activo: true } })
      : null;
    if (!usuario) {
      return res.status(400).json({ mensaje: 'Código inválido o expirado' });
    }

    // Mismo candado que login(): sin esto, el código de reset (solo 4 dígitos,
    // 10 000 combinaciones) quedaba protegido únicamente por el rate-limit de
    // IP del router — alguien rotando de IP podía probar miles de códigos
    // contra la misma cuenta dentro de la ventana de 15 minutos del código.
    if (usuario.bloqueo_hasta && new Date() < new Date(usuario.bloqueo_hasta)) {
      const minutosRestantes = Math.ceil((new Date(usuario.bloqueo_hasta) - new Date()) / 60000);
      return res.status(401).json({
        mensaje: `Cuenta bloqueada temporalmente. Intente en ${minutosRestantes} minuto${minutosRestantes !== 1 ? 's' : ''}.`,
      });
    }

    if (usuario.reset_code !== codigo) {
      usuario.intentos_fallidos = (usuario.intentos_fallidos || 0) + 1;
      if (usuario.intentos_fallidos >= INTENTOS_MAX) {
        usuario.bloqueo_hasta = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000);
        usuario.intentos_fallidos = 0;
      }
      await usuario.save();
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
    usuario.motivo_sesion_cerrada = 'Cambio de contraseña';
    usuario.session_version = (usuario.session_version || 0) + 1;
    usuario.sesion_activa = false;
    await usuario.save();

    await LogAcceso.create({
      usuario_id:     usuario.id,
      nombre_usuario: usuario.nombre,
      rol:            usuario.rol,
      tipo:           'Logout',
      fecha_hora:     new Date(),
      detalle: 'Sesión cerrada: contraseña restablecida exitosamente vía código',
    });

    return res.status(200).json({ success: true, mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en resetPassword:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { login, logout, me, forgotPassword, resetPassword, validatePassword };
