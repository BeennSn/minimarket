/**
 * datosPrueba.js
 * Carga datos de prueba en la base de datos.
 * Ejecución: node seeders/datosPrueba.js
 */

const bcrypt = require('bcryptjs');
const { sequelize, Categoria, Proveedor, Usuario, Producto, Venta, DetalleVenta } = require('../models');

// ────────────────────────────────────────────────────────────────────────────
// Datos a insertar
// ────────────────────────────────────────────────────────────────────────────

const CATEGORIAS_DATA = [
  'Lácteos',
  'Bebidas',
  'Snacks',
  'Galletas',
  'Arroz y Granos',
  'Limpieza',
  'Panadería',
  'Conservas',
];

const PROVEEDORES_DATA = [
  { nombre: 'Gloria S.A.', ruc: '20100190797', contacto: 'ventas@gloria.com.pe' },
  { nombre: 'Alicorp S.A.A.', ruc: '20100055237', contacto: 'contacto@alicorp.com.pe' },
  { nombre: 'Arca Continental', ruc: '20331061655', contacto: 'ventas@arcacontinental.pe' },
  { nombre: 'Molitalia S.A.', ruc: '20101362702', contacto: 'ventas@molitalia.com.pe' },
];

const USUARIOS_ADICIONALES = [
  {
    nombre: 'Juan Pérez',
    email: 'vendedor@minimarket.com',
    password: 'Vendedor123*',
    rol: 'Vendedor',
  },
  {
    nombre: 'María López',
    email: 'almacenero@minimarket.com',
    password: 'Almacen123*',
    rol: 'Almacenero',
  },
  {
    nombre: 'Carlos Ríos',
    email: 'gerente@minimarket.com',
    password: 'Gerente123*',
    rol: 'Gerente',
  },
];

const PRODUCTOS_DATA = [
  { nombre: 'Leche Gloria Entera 1L', marca: 'Gloria', categoria: 'Lácteos', precio: 3.50, stock: 50 },
  { nombre: 'Yogurt Gloria Fresa 500ml', marca: 'Gloria', categoria: 'Lácteos', precio: 4.20, stock: 30 },
  { nombre: 'Queso Mantecoso 200g', marca: 'Gloria', categoria: 'Lácteos', precio: 6.50, stock: 20 },
  { nombre: 'Inca Kola 500ml', marca: 'Arca Continental', categoria: 'Bebidas', precio: 2.00, stock: 100 },
  { nombre: 'Coca Cola 500ml', marca: 'Arca Continental', categoria: 'Bebidas', precio: 2.00, stock: 80 },
  { nombre: 'Agua San Luis 625ml', marca: 'Arca Continental', categoria: 'Bebidas', precio: 1.00, stock: 3 },
  { nombre: 'Chizitos 42g', marca: 'Alicorp', categoria: 'Snacks', precio: 1.50, stock: 60 },
  { nombre: 'Galleta Oreo 54g', marca: 'Alicorp', categoria: 'Galletas', precio: 2.50, stock: 45 },
  { nombre: 'Arroz Costeño 5kg', marca: 'Costeño', categoria: 'Arroz y Granos', precio: 18.00, stock: 0 },
  { nombre: 'Fideos Don Vittorio 500g', marca: 'Molitalia', categoria: 'Arroz y Granos', precio: 3.20, stock: 40 },
  { nombre: 'Detergente Ariel 500g', marca: 'P&G', categoria: 'Limpieza', precio: 8.50, stock: 25 },
  { nombre: 'Pan de Molde Bimbo', marca: 'Bimbo', categoria: 'Panadería', precio: 5.90, stock: 4 },
];

// ────────────────────────────────────────────────────────────────────────────
// Funciones principales
// ────────────────────────────────────────────────────────────────────────────

/**
 * Crea las categorías
 */
const crearCategorias = async () => {
  let created = 0;
  for (const nombre of CATEGORIAS_DATA) {
    try {
      const existe = await Categoria.findOne({ where: { nombre } });
      if (!existe) {
        await Categoria.create({ nombre });
        created++;
      }
    } catch (err) {
      console.error(`Error al crear categoría "${nombre}":`, err.message);
    }
  }
  return created;
};

/**
 * Crea los proveedores
 */
const crearProveedores = async () => {
  let created = 0;
  for (const prov of PROVEEDORES_DATA) {
    try {
      const existe = await Proveedor.findOne({ where: { ruc: prov.ruc } });
      if (!existe) {
        await Proveedor.create(prov);
        created++;
      }
    } catch (err) {
      console.error(`Error al crear proveedor "${prov.nombre}":`, err.message);
    }
  }
  return created;
};

/**
 * Crea usuarios adicionales
 */
const crearUsuariosAdicionales = async () => {
  let created = 0;
  for (const userData of USUARIOS_ADICIONALES) {
    try {
      const existe = await Usuario.findOne({ where: { email: userData.email } });
      if (!existe) {
        const password_hash = await bcrypt.hash(userData.password, 10);
        await Usuario.create({
          nombre: userData.nombre,
          email: userData.email,
          password_hash,
          rol: userData.rol,
          activo: true,
        });
        created++;
      }
    } catch (err) {
      console.error(`Error al crear usuario "${userData.email}":`, err.message);
    }
  }
  return created;
};

/**
 * Crea los productos
 */
const crearProductos = async () => {
  let created = 0;
  for (const prodData of PRODUCTOS_DATA) {
    try {
      // Obtener la categoría
      const categoria = await Categoria.findOne({ where: { nombre: prodData.categoria } });
      if (!categoria) {
        console.warn(`Categoría "${prodData.categoria}" no encontrada para producto "${prodData.nombre}"`);
        continue;
      }

      // Verificar que el producto no exista
      const existe = await Producto.findOne({
        where: {
          nombre: prodData.nombre,
          categoria_id: categoria.id,
        },
      });

      if (!existe) {
        await Producto.create({
          nombre: prodData.nombre,
          marca: prodData.marca,
          categoria_id: categoria.id,
          precio: prodData.precio,
          stock: prodData.stock,
          activo: true,
        });
        created++;
      }
    } catch (err) {
      console.error(`Error al crear producto "${prodData.nombre}":`, err.message);
    }
  }
  return created;
};

/**
 * Crea ventas de prueba con sus detalles
 */
const crearVentas = async () => {
  let created = 0;

  try {
    // Evitar duplicar ventas si ya existen
    const ventasExistentes = await Venta.count();
    if (ventasExistentes > 0) {
      return 0;
    }

    // Obtener usuarios
    const adminUser = await Usuario.findOne({ where: { rol: 'Administrador' } });
    const vendedor = await Usuario.findOne({ where: { email: 'vendedor@minimarket.com' } });

    if (!adminUser || !vendedor) {
      console.warn('No se encontraron usuarios para crear ventas');
      return 0;
    }

    // Obtener productos
    const productos = await Producto.findAll();
    const productoMap = {};
    productos.forEach((p) => {
      productoMap[p.nombre] = p;
    });

    // Venta 1: Vendedor Juan, método Efectivo, items: Leche x2 + Inca Kola x3
    {
      const leche = productoMap['Leche Gloria Entera 1L'];
      const incaKola = productoMap['Inca Kola 500ml'];

      if (leche && incaKola) {
        const montoTotal = leche.precio * 2 + incaKola.precio * 3;
        const venta = await Venta.create({
          usuario_id: vendedor.id,
          metodo_pago: 'Efectivo',
          monto_total: montoTotal,
          monto_recibido: montoTotal,
          vuelto: 0,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: leche.id,
          cantidad: 2,
          precio_unitario: leche.precio,
          subtotal: leche.precio * 2,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: incaKola.id,
          cantidad: 3,
          precio_unitario: incaKola.precio,
          subtotal: incaKola.precio * 3,
        });

        // Descontar stock
        await leche.decrement('stock', { by: 2 });
        await incaKola.decrement('stock', { by: 3 });

        created++;
      }
    }

    // Venta 2: Vendedor Juan, método Yape, items: Galleta Oreo x4 + Chizitos x2
    {
      const oreo = productoMap['Galleta Oreo 54g'];
      const chizitos = productoMap['Chizitos 42g'];

      if (oreo && chizitos) {
        const montoTotal = oreo.precio * 4 + chizitos.precio * 2;
        const venta = await Venta.create({
          usuario_id: vendedor.id,
          metodo_pago: 'Yape',
          monto_total: montoTotal,
          monto_recibido: null,
          vuelto: null,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: oreo.id,
          cantidad: 4,
          precio_unitario: oreo.precio,
          subtotal: oreo.precio * 4,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: chizitos.id,
          cantidad: 2,
          precio_unitario: chizitos.precio,
          subtotal: chizitos.precio * 2,
        });

        // Descontar stock
        await oreo.decrement('stock', { by: 4 });
        await chizitos.decrement('stock', { by: 2 });

        created++;
      }
    }

    // Venta 3: Admin, método Efectivo, items: Arroz Costeño x1 + Fideos x2, monto recibido con vuelto
    {
      const arroz = productoMap['Arroz Costeño 5kg'];
      const fideos = productoMap['Fideos Don Vittorio 500g'];

      if (arroz && fideos) {
        const montoTotal = arroz.precio * 1 + fideos.precio * 2;
        const montoRecibido = 25;
        const vuelto = montoRecibido - montoTotal;

        const venta = await Venta.create({
          usuario_id: adminUser.id,
          metodo_pago: 'Efectivo',
          monto_total: montoTotal,
          monto_recibido: montoRecibido,
          vuelto: vuelto,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: arroz.id,
          cantidad: 1,
          precio_unitario: arroz.precio,
          subtotal: arroz.precio * 1,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: fideos.id,
          cantidad: 2,
          precio_unitario: fideos.precio,
          subtotal: fideos.precio * 2,
        });

        // Descontar stock
        await arroz.decrement('stock', { by: 1 });
        await fideos.decrement('stock', { by: 2 });

        created++;
      }
    }

    // Venta 4: Vendedor Juan, método Plin, items: Yogurt x2 + Coca Cola x4
    {
      const yogurt = productoMap['Yogurt Gloria Fresa 500ml'];
      const cocaCola = productoMap['Coca Cola 500ml'];

      if (yogurt && cocaCola) {
        const montoTotal = yogurt.precio * 2 + cocaCola.precio * 4;
        const venta = await Venta.create({
          usuario_id: vendedor.id,
          metodo_pago: 'Plin',
          monto_total: montoTotal,
          monto_recibido: null,
          vuelto: null,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: yogurt.id,
          cantidad: 2,
          precio_unitario: yogurt.precio,
          subtotal: yogurt.precio * 2,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: cocaCola.id,
          cantidad: 4,
          precio_unitario: cocaCola.precio,
          subtotal: cocaCola.precio * 4,
        });

        // Descontar stock
        await yogurt.decrement('stock', { by: 2 });
        await cocaCola.decrement('stock', { by: 4 });

        created++;
      }
    }

    // Venta 5: Admin, método Efectivo, items: Detergente x1 + Pan de Molde x2, monto recibido exacto
    {
      const detergente = productoMap['Detergente Ariel 500g'];
      const pan = productoMap['Pan de Molde Bimbo'];

      if (detergente && pan) {
        const montoTotal = detergente.precio * 1 + pan.precio * 2;
        const venta = await Venta.create({
          usuario_id: adminUser.id,
          metodo_pago: 'Efectivo',
          monto_total: montoTotal,
          monto_recibido: montoTotal,
          vuelto: 0,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: detergente.id,
          cantidad: 1,
          precio_unitario: detergente.precio,
          subtotal: detergente.precio * 1,
        });

        await DetalleVenta.create({
          venta_id: venta.id,
          producto_id: pan.id,
          cantidad: 2,
          precio_unitario: pan.precio,
          subtotal: pan.precio * 2,
        });

        // Descontar stock
        await detergente.decrement('stock', { by: 1 });
        await pan.decrement('stock', { by: 2 });

        created++;
      }
    }
  } catch (err) {
    console.error('Error al crear ventas:', err.message);
  }

  return created;
};

// ────────────────────────────────────────────────────────────────────────────
// Función principal
// ────────────────────────────────────────────────────────────────────────────

const main = async () => {
  try {
    console.log('\n🔄 Iniciando carga de datos de prueba...\n');

    // Sincronizar modelos
    await sequelize.sync({ alter: true });

    // Crear datos en orden de dependencias
    const categoriasCreadas = await crearCategorias();
    console.log(`✅ Categorías creadas: ${categoriasCreadas}`);

    const proveedoresCreados = await crearProveedores();
    console.log(`✅ Proveedores creados: ${proveedoresCreados}`);

    const usuariosCreados = await crearUsuariosAdicionales();
    console.log(`✅ Usuarios creados: ${usuariosCreados}`);

    const productosCreados = await crearProductos();
    console.log(`✅ Productos creados: ${productosCreados}`);

    const ventasCreadas = await crearVentas();
    console.log(`✅ Ventas creadas: ${ventasCreadas}`);

    console.log('\n🎉 Datos de prueba cargados correctamente\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error al cargar datos de prueba:', err);
    process.exit(1);
  }
};

// Ejecutar
main();
