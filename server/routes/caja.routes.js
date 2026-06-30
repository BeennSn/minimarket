const { Router } = require('express');
const cajaController = require('../controllers/caja.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

// Cajero: gestión de su propio turno
router.post('/abrir',        verificarRol('Vendedor', 'Administrador'), cajaController.abrir);
router.post('/cerrar',       verificarRol('Vendedor', 'Administrador'), cajaController.cerrar);
router.get('/activo',        verificarRol('Vendedor', 'Administrador'), cajaController.obtenerActivo);
router.post('/movimientos',  verificarRol('Vendedor', 'Administrador'), cajaController.registrarMovimiento);

// Admin / Gerente: historial y aprobación
router.get('/historial',     verificarRol('Administrador', 'Gerente'),  cajaController.historial);
router.get('/:id',           verificarRol('Administrador', 'Gerente'),  cajaController.obtenerTurno);
router.patch('/:id/aprobar', verificarRol('Administrador', 'Gerente'),  cajaController.aprobar);

module.exports = router;
