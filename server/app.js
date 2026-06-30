const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors    = require('cors');

// Importar sequelize y todos los modelos (con sus asociaciones ya definidas)
const { sequelize } = require('./models');

// ─── Importar rutas ───────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth.routes');
const usuarioRoutes    = require('./routes/usuario.routes');
const categoriaRoutes   = require('./routes/categoria.routes');
const productoRoutes    = require('./routes/producto.routes');
const proveedorRoutes   = require('./routes/proveedor.routes');
const ventaRoutes       = require('./routes/venta.routes');
const clienteRoutes     = require('./routes/cliente.routes');
const inventarioRoutes  = require('./routes/inventario.routes');
const reporteRoutes          = require('./routes/reporte.routes');
const configuracionRoutes    = require('./routes/configuracion.routes');
const cajaRoutes             = require('./routes/caja.routes');
const consultaRoutes         = require('./routes/consulta.routes');

// ─── Importar seeders ─────────────────────────────────────────────────────────
const seedAdmin = require('./seeders/adminSeed');

const app = express();

// ─── Middlewares globales ─────────────────────────────────────────────────────
const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin, credentials: true } : {}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/usuarios',   usuarioRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/productos',   productoRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/ventas',      ventaRoutes);
app.use('/api/clientes',    clienteRoutes);
app.use('/api/inventario',  inventarioRoutes);
app.use('/api/reportes',       reporteRoutes);
app.use('/api/configuracion',  configuracionRoutes);
app.use('/api/caja',           cajaRoutes);
app.use('/api/consulta',       consultaRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Minimarket API running' });
});

// ─── Solo arrancar servidor si NO estamos en Vercel ──────────────────────────
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;

  sequelize
    .sync(process.env.NODE_ENV === 'production' ? { force: false } : { alter: true })
    .then(async () => {
      console.log('✅ Tablas sincronizadas correctamente');
      await seedAdmin();
      app.listen(PORT, () => {
        console.log(`🚀 Server listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('❌ Unable to sync database:', err);
      process.exit(1);
    });
}

module.exports = app;
