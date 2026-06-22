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

// GET  /api/usuarios        → solo Administrador
router.get(
  '/',
  verificarRol('Administrador'),
  usuarioController.listar
);

// GET  /api/usuarios/:id    → solo Administrador
router.get(
  '/:id',
  verificarRol('Administrador'),
  usuarioController.obtener
);

// POST /api/usuarios        → solo Administrador
router.post(
  '/',
  verificarRol('Administrador'),
  usuarioController.crear
);

// PUT  /api/usuarios/:id    → solo Administrador
router.put(
  '/:id',
  verificarRol('Administrador'),
  usuarioController.actualizar
);

// PATCH /api/usuarios/:id/password  → cualquier rol autenticado (solo la propia contraseña)
router.patch(
  '/:id/password',
  usuarioController.cambiarPassword
);

// PATCH /api/usuarios/:id/desactivar → solo Administrador
router.patch(
  '/:id/desactivar',
  verificarRol('Administrador'),
  usuarioController.desactivar
);

// PATCH /api/usuarios/:id/reactivar  → solo Administrador
router.patch(
  '/:id/reactivar',
  verificarRol('Administrador'),
  usuarioController.reactivar
);

module.exports = router;
