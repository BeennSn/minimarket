/**
 * usuario.routes.js
 * Rutas del módulo de gestión de usuarios.
 * Todas requieren token válido. Algunas están restringidas al rol Administrador.
 */

const { Router } = require('express');
const usuarioController          = require('../controllers/usuario.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(verificarToken);

// GET  /api/usuarios        → SuperAdmin y Administrador (Administrador: solo lectura)
router.get(
  '/',
  verificarRol('SuperAdmin', 'Administrador'),
  usuarioController.listar
);

// GET  /api/usuarios/:id    → SuperAdmin y Administrador (Administrador: solo lectura)
router.get(
  '/:id',
  verificarRol('SuperAdmin', 'Administrador'),
  usuarioController.obtener
);

// POST /api/usuarios        → exclusivo SuperAdmin
router.post(
  '/',
  verificarRol('SuperAdmin'),
  usuarioController.crear
);

// PUT  /api/usuarios/:id    → exclusivo SuperAdmin
router.put(
  '/:id',
  verificarRol('SuperAdmin'),
  usuarioController.actualizar
);

// PATCH /api/usuarios/:id/password  → cualquier rol autenticado (solo la propia contraseña)
router.patch(
  '/:id/password',
  usuarioController.cambiarPassword
);

// PATCH /api/usuarios/:id/forzar-cierre-sesion → exclusivo SuperAdmin
router.patch(
  '/:id/forzar-cierre-sesion',
  verificarRol('SuperAdmin'),
  usuarioController.forzarCierreSesion
);

// PATCH /api/usuarios/:id/desactivar → exclusivo SuperAdmin
router.patch(
  '/:id/desactivar',
  verificarRol('SuperAdmin'),
  usuarioController.desactivar
);

// PATCH /api/usuarios/:id/reactivar  → exclusivo SuperAdmin
router.patch(
  '/:id/reactivar',
  verificarRol('SuperAdmin'),
  usuarioController.reactivar
);

module.exports = router;
