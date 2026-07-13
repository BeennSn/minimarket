const { Router } = require('express');
const logAccesoController = require('../controllers/logAcceso.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

// GET /api/logs-acceso → exclusivo Administrador (y SuperAdmin, vía verificarRol)
router.get(
  '/',
  verificarRol('Administrador'),
  logAccesoController.listar
);

module.exports = router;
