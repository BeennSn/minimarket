/**
 * categoria.routes.js
 * Rutas del módulo de gestión de categorías.
 * Todas requieren token válido.
 */

const { Router } = require('express');
const categoriaController = require('../controllers/categoria.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(verificarToken);

// GET  /api/categorias        → cualquier rol autenticado
router.get('/', categoriaController.listar);

// POST /api/categorias        → Administrador, Almacenero
router.post(
  '/',
  verificarRol('Administrador', 'Almacenero'),
  categoriaController.crear
);

// PUT  /api/categorias/:id    → Administrador, Almacenero
router.put(
  '/:id',
  verificarRol('Administrador', 'Almacenero'),
  categoriaController.actualizar
);

// DELETE /api/categorias/:id  → solo Administrador
router.delete(
  '/:id',
  verificarRol('Administrador'),
  categoriaController.eliminar
);

module.exports = router;
