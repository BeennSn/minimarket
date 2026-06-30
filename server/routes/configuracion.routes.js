const { Router } = require('express');
const configuracionController = require('../controllers/configuracion.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);

// GET /api/configuracion → cualquier usuario autenticado
router.get('/', configuracionController.obtener);

// PUT /api/configuracion → solo Administrador
router.put('/', verificarRol('Administrador'), configuracionController.actualizar);

module.exports = router;
