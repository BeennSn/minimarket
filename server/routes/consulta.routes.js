const { Router } = require('express');
const { verificarToken } = require('../middlewares/auth.middleware');
const { consultarDni, consultarRuc } = require('../controllers/consulta.controller');

const router = Router();

router.use(verificarToken);

router.get('/dni/:dni', consultarDni);
router.get('/ruc/:ruc', consultarRuc);

module.exports = router;
