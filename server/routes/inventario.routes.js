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

// Gerente no tiene acceso a Inventario (ver CLAUDE.md — su acceso es
// Dashboard, ventas de solo consulta, historial, solicitudes y reportes), y
// el frontend nunca expone esta pantalla para ese rol (App.jsx: ruta
// /inventario solo admite Almacenero/Administrador) — el permiso de acá
// quedaba muerto, sin nadie que pudiera usarlo.
router.get(
  '/entradas',
  verificarRol('Almacenero', 'Administrador'),
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
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.listarBajas
);

// Ajustes (conteo físico)
router.post(
  '/ajustes',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.registrarAjuste
);

router.get(
  '/ajustes',
  verificarRol('Almacenero', 'Administrador'),
  inventarioController.listarAjustes
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
