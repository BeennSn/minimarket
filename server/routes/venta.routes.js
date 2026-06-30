const { Router } = require('express');
const ventaController = require('../controllers/venta.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

router.post(
  '/',
  verificarRol('Vendedor', 'Administrador'),
  ventaController.registrar
);

router.get(
  '/',
  verificarRol('Administrador', 'Gerente'),
  ventaController.listar
);

router.get(
  '/:id',
  verificarRol('Administrador', 'Gerente', 'Vendedor'),
  ventaController.obtener
);

router.patch(
  '/:id/verificar-yape',
  verificarRol('Vendedor', 'Administrador'),
  ventaController.verificarYape
);

router.patch(
  '/:id/anular',
  verificarRol('Administrador', 'Gerente'),
  ventaController.anular
);

module.exports = router;
