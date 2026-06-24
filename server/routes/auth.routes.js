/**
 * auth.routes.js
 * Rutas del módulo de autenticación.
 */

const { Router } = require('express');
const authController  = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = Router();

// POST /api/auth/login  → autenticar usuario
router.post('/login', authController.login);

// POST /api/auth/logout → cerrar sesión (requiere token válido)
router.post('/logout', verificarToken, authController.logout);

// POST /api/auth/forgot-password → pedir código de recuperación (pública)
router.post('/forgot-password', authController.forgotPassword);

// POST /api/auth/reset-password → validar código y cambiar contraseña (pública)
router.post('/reset-password', authController.resetPassword);

// (legado) compatibilidad con frontend anterior
router.post('/reset/solicitar', authController.forgotPassword);
router.post('/reset/confirmar', authController.resetPassword);

module.exports = router;
