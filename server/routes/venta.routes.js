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

module.exports = router;
