const { Router } = require('express');
const reporteController = require('../controllers/reporte.controller');
const { verificarToken, verificarRol } = require('../middlewares/auth.middleware');

const router = Router();

router.use(verificarToken);
router.use(verificarRol('Gerente', 'Administrador'));

router.get('/ventas/resumen',         reporteController.resumenVentas);
router.get('/ventas/productos-top',   reporteController.productosTop);
router.get('/ventas/por-dia',         reporteController.ventasPorDia);
router.get('/ventas/por-metodo-pago', reporteController.ventasPorMetodoPago);
router.get('/inventario/stock-critico',  reporteController.stockCritico);
router.get('/inventario/resumen',        reporteController.resumenInventario);

module.exports = router;
