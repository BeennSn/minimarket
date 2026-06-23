const { Router } = require('express');
const inventarioController = require('../controllers/inventario.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

// Entradas
router.post(
  '/entradas',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.registrarEntrada
);

router.get(
  '/entradas',
  verificarRol('Almacenero', 'Administrador', 'Gerente'),
  inventarioController.listarEntradas
);

// Bajas
router.post(
  '/bajas',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.registrarBaja
);

router.get(
  '/bajas',
  verificarRol('Almacenero', 'Administrador', 'Gerente'),
  inventarioController.listarBajas
);

// Solicitudes
router.post(
  '/solicitudes',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.crearSolicitud
);

router.get(
  '/solicitudes',
  verificarRol('Almacenero', 'Administrador', 'Gerente'),
  inventarioController.listarSolicitudes
);

router.patch(
  '/solicitudes/:id/aprobar',
  verificarRol('Administrador', 'Gerente'),
  inventarioController.aprobarSolicitud
);

router.patch(
  '/solicitudes/:id/rechazar',
  verificarRol('Administrador', 'Gerente'),
  inventarioController.rechazarSolicitud
);

router.patch(
  '/solicitudes/:id/completar',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.completarSolicitud
);

module.exports = router;
