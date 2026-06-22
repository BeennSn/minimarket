const { Router } = require('express');
const proveedorController = require('../controllers/proveedor.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

router.get(
  '/',
  verificarRol('Administrador', 'Almacenero', 'Gerente'),
  proveedorController.listar
);

router.get(
  '/:id',
  verificarRol('Administrador', 'Almacenero', 'Gerente'),
  proveedorController.obtener
);

router.post(
  '/',
  verificarRol('Administrador', 'Almacenero'),
  proveedorController.crear
);

router.put(
  '/:id',
  verificarRol('Administrador', 'Almacenero'),
  proveedorController.actualizar
);

router.patch(
  '/:id/desactivar',
  verificarRol('Administrador'),
  proveedorController.desactivar
);

router.patch(
  '/:id/reactivar',
  verificarRol('Administrador'),
  proveedorController.reactivar
);

module.exports = router;
