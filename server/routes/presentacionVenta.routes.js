/**
 * presentacionVenta.routes.js
 * Rutas del CRUD de presentaciones de venta de un producto. Montadas en
 * producto.routes.js bajo /api/productos/:id/presentaciones — requiere
 * :id (mergeParams) para saber a qué producto pertenecen.
 */

const { Router } = require('express');
const presentacionVentaController = require('../controllers/presentacionVenta.controller');
const { verificarRol } = require('../middlewares/auth.middleware');

const router = Router({ mergeParams: true });

// El middleware verificarToken ya corre a nivel de producto.routes.js
// (router.use(verificarToken) antes de montar estas rutas).

// POST /api/productos/:id/presentaciones                     → Administrador, Almacenero
router.post(
  '/',
  verificarRol('Administrador', 'Almacenero'),
  presentacionVentaController.crear
);

// PUT  /api/productos/:id/presentaciones/:presentacionId     → Administrador, Almacenero
router.put(
  '/:presentacionId',
  verificarRol('Administrador', 'Almacenero'),
  presentacionVentaController.actualizar
);

// PATCH /api/productos/:id/presentaciones/:presentacionId/desactivar → Administrador, Almacenero
router.patch(
  '/:presentacionId/desactivar',
  verificarRol('Administrador', 'Almacenero'),
  presentacionVentaController.desactivar
);

// PATCH /api/productos/:id/presentaciones/:presentacionId/reactivar  → Administrador, Almacenero
router.patch(
  '/:presentacionId/reactivar',
  verificarRol('Administrador', 'Almacenero'),
  presentacionVentaController.reactivar
);

module.exports = router;
