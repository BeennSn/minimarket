/**
 * producto.routes.js
 * Rutas del módulo de gestión de productos.
 * Todas requieren token válido.
 */

const { Router } = require('express');
const productoController = require('../controllers/producto.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

// Todas las rutas de este módulo requieren autenticación
router.use(verificarToken);

// GET  /api/productos         → Administrador, Almacenero, Gerente
router.get(
  '/',
  verificarRol('Administrador', 'Almacenero', 'Gerente'),
  productoController.listar
);

// GET  /api/productos/activos → cualquier rol autenticado (para POS)
router.get('/activos', productoController.listarActivos);

// GET  /api/productos/vencer  → cualquier rol autenticado (stock próximo a vencer)
router.get('/vencer', productoController.listarProximosVencer);

// GET  /api/productos/codigo/:codigo → cualquier rol autenticado (para escáner)
router.get('/codigo/:codigo', productoController.buscarPorCodigo);

// GET  /api/productos/buscar-codigo/:codigo → Administrador, Almacenero (autocompletar registro vía APIs externas)
router.get(
  '/buscar-codigo/:codigo',
  verificarRol('Administrador', 'Almacenero'),
  productoController.buscarInfoExterna
);

// GET  /api/productos/:id     → cualquier rol autenticado
router.get('/:id', productoController.obtener);

// POST /api/productos         → Administrador, Almacenero
router.post(
  '/',
  verificarRol('Administrador', 'Almacenero'),
  productoController.crear
);

// PUT  /api/productos/:id     → Administrador, Almacenero
router.put(
  '/:id',
  verificarRol('Administrador', 'Almacenero'),
  productoController.actualizar
);

// PATCH /api/productos/:id/desactivar  → Administrador, Almacenero
router.patch(
  '/:id/desactivar',
  verificarRol('Administrador', 'Almacenero'),
  productoController.desactivar
);

// PATCH /api/productos/:id/reactivar   → Administrador, Almacenero
router.patch(
  '/:id/reactivar',
  verificarRol('Administrador', 'Almacenero'),
  productoController.reactivar
);

module.exports = router;
