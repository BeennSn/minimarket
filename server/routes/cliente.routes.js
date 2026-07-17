const { Router } = require('express');
const clienteController = require('../controllers/cliente.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

router.get(
  '/',
  verificarRol('Administrador', 'Gerente'),
  clienteController.listar
);

router.get(
  '/dni/:dni',
  verificarRol('Vendedor', 'Administrador'),
  clienteController.buscarPorDni
);

router.put(
  '/:id',
  verificarRol('Administrador'),
  clienteController.actualizar
);

module.exports = router;
