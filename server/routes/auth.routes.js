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

// POST /api/auth/reset/solicitar → pedir código de recuperación (pública)
router.post('/reset/solicitar', authController.solicitarReset);

// POST /api/auth/reset/confirmar → validar código y cambiar contraseña (pública)
router.post('/reset/confirmar', authController.confirmarReset);

module.exports = router;
