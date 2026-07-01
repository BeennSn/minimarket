/**
 * sembrar_datos.js
 * Carga datos de prueba completos para probar todos los módulos del sistema.
 * Uso: node server/scripts/sembrar_datos.js   (desde la raíz del proyecto)
 *
 * Crea: categorías, proveedores, productos, ventas históricas (30 días),
 *       entradas de mercadería, bajas de inventario, solicitudes de reposición.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const {
  sequelize,
  Categoria, Proveedor, Producto, Usuario,
  Venta, DetalleVenta, EntradaMercaderia, BajaInventario, SolicitudReposicion,
  Turno, MovimientoCaja,
} = require('../models');

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Fecha N días atrás a una hora dada
const hace = (dias, hora = 10, minuto = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

// Fecha futura N días desde hoy
const en = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
};

// ─── Datos maestros ───────────────────────────────────────────────────────────

const CATEGORIAS = [
  'Lácteos', 'Bebidas', 'Abarrotes', 'Limpieza',
  'Cuidado Personal', 'Snacks', 'Golosinas', 'Conservas', 'Condimentos', 'Panadería',
];

const PROVEEDORES = [
  { nombre: 'Gloria S.A.',                  ruc: '20100190797', contacto: 'ventas@gloria.com.pe' },
  { nombre: 'Arca Continental Lindley',     ruc: '20331061655', contacto: 'dist@arcacontinental.pe' },
  { nombre: 'Distribuidora Mayorista S.A.', ruc: '20512345678', contacto: 'pedidos@distmayorista.com' },
  { nombre: 'Alicorp S.A.',                 ruc: '20100055237', contacto: 'contacto@alicorp.com.pe' },
  { nombre: 'Colgate-Palmolive Perú',       ruc: '20100136862', contacto: 'servicio@colgate.pe' },
  { nombre: 'PepsiCo Alimentos Perú',       ruc: '20101045989', contacto: 'dist.snacks@pepsico.pe' },
  { nombre: 'Nestlé Perú S.A.',             ruc: '20100840454', contacto: 'ventas@nestle.pe' },
  { nombre: 'Florida Group Perú',           ruc: '20101362702', contacto: 'ventas@florida.com.pe' },
  { nombre: 'Bimbo del Perú S.A.',          ruc: '20101362800', contacto: 'ventas@bimbo.pe' },
];

const PRODUCTOS = [
  // Lácteos
  { nombre: 'Leche Gloria Evaporada 1L',       marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 4.50,  stock: 60,  cod: '7750010001001', fv: en(360) },
  { nombre: 'Leche Gloria Fresca 1L',          marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 5.20,  stock: 2,   cod: '7750010003005', fv: en(8)   },
  { nombre: 'Leche Ideal Cremosita 500ml',     marca: 'Ideal',        cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 3.80,  stock: 45,  cod: '7750020001009', fv: en(15)  },
  { nombre: 'Yogurt Gloria Fresa 1L',          marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 7.50,  stock: 35,  cod: '7750030002002', fv: en(12)  },
  { nombre: 'Yogurt Gloria Natural 1L',        marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 7.50,  stock: 3,   cod: '7750030001005', fv: en(6)   },
  { nombre: 'Mantequilla Gloria 200g',         marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 6.90,  stock: 0,   cod: '7750040001001', fv: en(90)  },
  { nombre: 'Queso Fresco 250g',               marca: 'Laive',        cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 8.50,  stock: 20,  cod: '7750050001008', fv: en(200) },

  // Bebidas
  { nombre: 'Inca Kola 500ml',                 marca: 'Inca Kola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  stock: 80,  cod: '7750060001004', fv: en(365), unidadCompra: 'Caja',    factorConversion: 12 },
  { nombre: 'Inca Kola 2.25L',                 marca: 'Inca Kola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 8.00,  stock: 50,  cod: '7750060002001', fv: en(365) },
  { nombre: 'Coca Cola 500ml',                 marca: 'Coca Cola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  stock: 80,  cod: '7750070001000', fv: en(365), unidadCompra: 'Caja',    factorConversion: 12 },
  { nombre: 'Coca Cola 2.25L',                 marca: 'Coca Cola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 8.00,  stock: 50,  cod: '7750070002007', fv: en(365) },
  { nombre: 'Sprite 500ml',                    marca: 'Sprite',       cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  stock: 60,  cod: '7750080001007', fv: en(365) },
  { nombre: 'Agua Cielo 500ml',                marca: 'Cielo',        cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 1.50,  stock: 100, cod: '7750100001002', fv: en(365), unidadCompra: 'Paquete', factorConversion: 24 },
  { nombre: 'Agua Cielo 2L',                   marca: 'Cielo',        cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 3.00,  stock: 70,  cod: '7750100002009', fv: en(365) },
  { nombre: 'Energizante Monster 473ml',        marca: 'Monster',      cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 6.00,  stock: 35,  cod: '7750110002006', fv: en(365) },
  { nombre: 'Jugo Pulp Naranja 1L',            marca: 'Pulp',         cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 5.50,  stock: 4,   cod: '7750120001005', fv: en(20)  },

  // Abarrotes
  { nombre: 'Arroz Costeño 1kg',               marca: 'Costeño',      cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.80,  stock: 90,  cod: '7750200001005', fv: en(730) },
  { nombre: 'Arroz Costeño 5kg',               marca: 'Costeño',      cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 17.50, stock: 40,  cod: '7750200002002', fv: en(730) },
  { nombre: 'Azúcar Rubia Cartavio 1kg',       marca: 'Cartavio',     cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.50,  stock: 80,  cod: '7750210001001', fv: en(730) },
  { nombre: 'Fideos Don Vittorio Spaghetti 500g', marca: 'Don Vittorio', cat: 'Abarrotes', prov: 'Distribuidora Mayorista S.A.', precio: 2.20, stock: 60,  cod: '7750220001008', fv: en(730) },
  { nombre: 'Aceite Primor 1L',                marca: 'Primor',       cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 7.50,  stock: 5,   cod: '7750230001004', fv: en(730) },
  { nombre: 'Aceite Primor 900ml',             marca: 'Primor',       cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 6.80,  stock: 45,  cod: '7750230002001', fv: en(730) },
  { nombre: 'Sal Marina Emsal 1kg',            marca: 'Emsal',        cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 1.50,  stock: 80,  cod: '7750240001000', fv: en(730) },
  { nombre: 'Avena Tres Ositos 500g',          marca: 'Tres Ositos',  cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 4.00,  stock: 1,   cod: '7750260001003', fv: en(365) },
  { nombre: 'Harina Blanca Flor 1kg',          marca: 'Blanca Flor',  cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.50,  stock: 45,  cod: '7750270001000', fv: en(365) },

  // Limpieza
  { nombre: 'Detergente Ace 1kg',              marca: 'Ace',          cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 8.50,  stock: 40,  cod: '7750300001007', fv: en(730) },
  { nombre: 'Detergente Bolívar 1kg',          marca: 'Bolívar',      cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 6.50,  stock: 35,  cod: '7750300002004', fv: en(730) },
  { nombre: 'Lavavajillas Ayudín 500ml',       marca: 'Ayudín',       cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 7.00,  stock: 30,  cod: '7750310001003', fv: en(730) },
  { nombre: 'Lejía Clorox 1L',                 marca: 'Clorox',       cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 4.00,  stock: 40,  cod: '7750330001006', fv: en(730) },
  { nombre: 'Papel Higiénico Suave 4und',      marca: 'Suave',        cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 6.00,  stock: 60,  cod: '7750340001002', fv: en(730) },
  { nombre: 'Jabón Antibacterial Protex 125g', marca: 'Protex',       cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 3.50,  stock: 3,   cod: '7750350001009', fv: en(730) },

  // Cuidado Personal
  { nombre: 'Shampoo Sedal 400ml',             marca: 'Sedal',        cat: 'Cuidado Personal', prov: 'Alicorp S.A.',            precio: 12.00, stock: 25,  cod: '7750400001000', fv: en(730) },
  { nombre: 'Pasta Dental Colgate 90g',        marca: 'Colgate',      cat: 'Cuidado Personal', prov: 'Colgate-Palmolive Perú',  precio: 5.00,  stock: 50,  cod: '7750430001009', fv: en(730) },
  { nombre: 'Desodorante Axe 150ml',           marca: 'Axe',          cat: 'Cuidado Personal', prov: 'Colgate-Palmolive Perú',  precio: 11.00, stock: 0,   cod: '7750420001002', fv: en(730) },

  // Snacks
  { nombre: 'Papas Lays 120g',                 marca: 'Lays',         cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 4.50,  stock: 50,  cod: '7750500001003', fv: en(180) },
  { nombre: 'Papas Lays 240g',                 marca: 'Lays',         cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 8.00,  stock: 30,  cod: '7750500002000', fv: en(180) },
  { nombre: 'Doritos 120g',                    marca: 'Doritos',      cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 4.50,  stock: 45,  cod: '7750510001000', fv: en(25)  },
  { nombre: 'Cheetos 100g',                    marca: 'Cheetos',      cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 3.50,  stock: 50,  cod: '7750520001006', fv: en(180) },
  { nombre: 'Canchita Popcorn 100g',           marca: 'Canchita',     cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 2.50,  stock: 40,  cod: '7750530001002', fv: en(180) },

  // Golosinas
  { nombre: 'Chocolate Sublime 50g',           marca: 'Sublime',      cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 2.00,  stock: 80,  cod: '7750600001006', fv: en(365) },
  { nombre: 'Chocolate Triángulo 30g',         marca: 'Triángulo',    cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 1.50,  stock: 4,   cod: '7750610001002', fv: en(22)  },
  { nombre: 'Galleta Oreo 100g',               marca: 'Oreo',         cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 3.00,  stock: 50,  cod: '7750630001005', fv: en(365) },
  { nombre: 'Galleta Soda Field 200g',         marca: 'Field',        cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 2.50,  stock: 55,  cod: '7750640001001', fv: en(365) },
  { nombre: 'Caramelos Halls 12und',           marca: 'Halls',        cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 3.00,  stock: 60,  cod: '7750620001009', fv: en(365) },
  { nombre: 'Mentitas 30g',                    marca: 'Mentitas',     cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 1.00,  stock: 100, cod: '7750650001008', fv: en(365) },

  // Conservas
  { nombre: 'Atún Florida Lomitos 170g',       marca: 'Florida',      cat: 'Conservas',   prov: 'Florida Group Perú',          precio: 5.50,  stock: 40,  cod: '7750700001009', fv: en(730) },
  { nombre: 'Atún San Andrés 170g',            marca: 'San Andrés',   cat: 'Conservas',   prov: 'Florida Group Perú',          precio: 4.50,  stock: 35,  cod: '7750710001005', fv: en(730) },
  { nombre: 'Leche Condensada Gloria 400g',    marca: 'Gloria',       cat: 'Conservas',   prov: 'Gloria S.A.',                  precio: 6.50,  stock: 30,  cod: '7750730001008', fv: en(25)  },

  // Condimentos
  { nombre: 'Ají Molido 50g',                  marca: 'Dos Caballos', cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 2.00,  stock: 40,  cod: '7750800001001', fv: en(365) },
  { nombre: 'Sillao Maggi 500ml',              marca: 'Maggi',        cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 7.00,  stock: 25,  cod: '7750810001008', fv: en(365) },
  { nombre: 'Vinagre Tinto 500ml',             marca: 'Z\'ing',       cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 3.00,  stock: 30,  cod: '7750820001004', fv: en(365) },

  // Panadería
  { nombre: 'Pan Molde Bimbo 500g',            marca: 'Bimbo',        cat: 'Panadería',   prov: 'Bimbo del Perú S.A.',         precio: 7.50,  stock: 30,  cod: '7750900001004', fv: en(14)  },
  { nombre: 'Pan Integral Bimbo 500g',         marca: 'Bimbo',        cat: 'Panadería',   prov: 'Bimbo del Perú S.A.',         precio: 8.50,  stock: 5,   cod: '7750900002001', fv: en(14)  },
];

// ─── Lógica de sembrado ───────────────────────────────────────────────────────

async function crearMaestros(admin) {
  const catMap = {};
  for (const nombre of CATEGORIAS) {
    const [cat] = await Categoria.findOrCreate({ where: { nombre } });
    catMap[nombre] = cat.id;
  }
  console.log(`  ✓ ${CATEGORIAS.length} categorías`);

  const provMap = {};
  for (const p of PROVEEDORES) {
    const [prov] = await Proveedor.findOrCreate({ where: { ruc: p.ruc }, defaults: p });
    provMap[prov.nombre] = prov.id;
  }
  console.log(`  ✓ ${PROVEEDORES.length} proveedores`);

  const prodMap = {};
  let count = 0;
  for (const p of PRODUCTOS) {
    const catId  = catMap[p.cat];
    const provId = provMap[p.prov];
    if (!catId || !provId) {
      console.warn(`  ⚠ Saltando ${p.nombre}: cat="${p.cat}" prov="${p.prov}"`);
      continue;
    }
    const [prod, created] = await Producto.findOrCreate({
      where: { codigo_barras: p.cod },
      defaults: {
        nombre: p.nombre, marca: p.marca,
        categoria_id: catId, proveedor_id: provId,
        precio: p.precio, stock: 0,
        codigo_barras: p.cod,
        activo: true,
        unidad_compra: p.unidadCompra || 'Unidad',
        factor_conversion: p.factorConversion || 1,
      },
    });
    if (created) {
      count++;
      // Lote inicial: respalda el stock declarado con un lote real (cantidad_restante)
      if (p.stock > 0) {
        await EntradaMercaderia.create({
          producto_id: prod.id,
          proveedor_id: provId,
          cantidad: p.stock,
          cantidad_restante: p.stock,
          usuario_id: admin.id,
          fecha_vencimiento: p.fv || null,
        });
        prod.stock = p.stock;
        await prod.save();
      }
    }
    prodMap[p.nombre] = prod;
  }
  console.log(`  ✓ ${count} productos`);

  return { catMap, provMap, prodMap };
}

async function crearVentas(prodMap, admin, vendedor) {
  // Ventas históricas: últimos 30 días
  // Cada venta: usuario, método pago, tipo comprobante, items
  const combos = [
    // [diasAtras, hora, usuario, metodoPago, tipoComprobante, [[producto, cantidad]], montoRecibido, dniOpc]
    [30, 9,  admin,    'Efectivo', 'Boleta', [['Inca Kola 500ml', 3], ['Papas Lays 120g', 2]], 15],
    [29, 11, vendedor, 'Efectivo', 'Boleta', [['Agua Cielo 500ml', 4], ['Galleta Oreo 100g', 2]], 20],
    [28, 10, vendedor, 'Yape',     'Boleta', [['Chocolate Sublime 50g', 5], ['Mentitas 30g', 3]], null],
    [27, 14, admin,    'Efectivo', 'Boleta', [['Arroz Costeño 1kg', 2], ['Azúcar Rubia Cartavio 1kg', 1]], 20],
    [26, 9,  vendedor, 'Yape',     'Boleta', [['Coca Cola 500ml', 4], ['Doritos 120g', 1]], null],
    [25, 16, admin,    'Efectivo', 'Boleta', [['Pan Molde Bimbo 500g', 2], ['Mantequilla Gloria 200g', 1]], 25],
    [24, 10, vendedor, 'Efectivo', 'Boleta', [['Leche Gloria Evaporada 1L', 3], ['Galleta Soda Field 200g', 2]], 25],
    [23, 11, admin,    'Yape',     'Boleta', [['Agua Cielo 2L', 2], ['Cheetos 100g', 2]], null],
    [22, 14, vendedor, 'Efectivo', 'Boleta', [['Fideos Don Vittorio Spaghetti 500g', 3], ['Sal Marina Emsal 1kg', 1]], 15],
    [21, 9,  admin,    'Efectivo', 'Factura', [['Detergente Ace 1kg', 2], ['Lejía Clorox 1L', 3]], 40, null, '20100055237', 'Empresa ABC S.A.C.', 'Av. Industrial 123'],
    [20, 10, vendedor, 'Yape',     'Boleta', [['Inca Kola 2.25L', 2], ['Coca Cola 2.25L', 1]], null],
    [19, 11, admin,    'Efectivo', 'Boleta', [['Atún Florida Lomitos 170g', 4], ['Arroz Costeño 1kg', 1]], 30],
    [18, 15, vendedor, 'Efectivo', 'Boleta', [['Galleta Oreo 100g', 3], ['Chocolate Sublime 50g', 4]], 20],
    [17, 9,  admin,    'Yape',     'Boleta', [['Leche Gloria Evaporada 1L', 2], ['Yogurt Gloria Fresa 1L', 1]], null],
    [16, 10, vendedor, 'Efectivo', 'Boleta', [['Papas Lays 240g', 2], ['Canchita Popcorn 100g', 3]], 30],
    [15, 14, admin,    'Efectivo', 'Boleta', [['Agua Cielo 500ml', 6], ['Sprite 500ml', 3]], 25],
    [14, 9,  vendedor, 'Yape',     'Boleta', [['Shampoo Sedal 400ml', 1], ['Pasta Dental Colgate 90g', 2]], null],
    [13, 11, admin,    'Efectivo', 'Boleta', [['Aceite Primor 900ml', 1], ['Azúcar Rubia Cartavio 1kg', 2]], 20],
    [12, 16, vendedor, 'Efectivo', 'Boleta', [['Inca Kola 500ml', 5], ['Mentitas 30g', 5]], 25],
    [11, 10, admin,    'Yape',     'Boleta', [['Arroz Costeño 5kg', 1], ['Fideos Don Vittorio Spaghetti 500g', 2]], null],
    [10, 9,  vendedor, 'Efectivo', 'Boleta', [['Coca Cola 500ml', 3], ['Papas Lays 120g', 3]], 25],
    [9,  14, admin,    'Efectivo', 'Factura', [['Atún San Andrés 170g', 6], ['Leche Condensada Gloria 400g', 4]], 60, null, '20200055237', 'Distribuidora Xperta S.A.C.', 'Jr. Comercio 456'],
    [8,  10, vendedor, 'Yape',     'Boleta', [['Galleta Soda Field 200g', 3], ['Caramelos Halls 12und', 4]], null],
    [7,  9,  admin,    'Efectivo', 'Boleta', [['Leche Gloria Evaporada 1L', 4], ['Yogurt Gloria Fresa 1L', 2]], 40],
    [6,  11, vendedor, 'Efectivo', 'Boleta', [['Agua Cielo 500ml', 8], ['Agua Cielo 2L', 2]], 20],
    [5,  14, admin,    'Yape',     'Boleta', [['Chocolate Sublime 50g', 6], ['Doritos 120g', 2]], null],
    [4,  10, vendedor, 'Efectivo', 'Boleta', [['Inca Kola 500ml', 4], ['Coca Cola 2.25L', 2]], 30],
    [3,  9,  admin,    'Efectivo', 'Boleta', [['Arroz Costeño 1kg', 3], ['Aceite Primor 1L', 1]], 25],
    [2,  11, vendedor, 'Yape',     'Boleta', [['Pan Molde Bimbo 500g', 1], ['Galleta Oreo 100g', 2]], null],
    [1,  15, admin,    'Efectivo', 'Boleta', [['Leche Gloria Evaporada 1L', 2], ['Sprite 500ml', 3]], 20],
    [0,  10, vendedor, 'Efectivo', 'Boleta', [['Papas Lays 120g', 2], ['Cheetos 100g', 2], ['Mentitas 30g', 4]], 25],
    [0,  14, admin,    'Yape',     'Boleta', [['Inca Kola 500ml', 3], ['Agua Cielo 500ml', 3]], null],
  ];

  const MONTO_APERTURA = 200.00;
  const turnoMap    = {}; // key: `${diasAtras}-${usuarioId}` → Turno
  const turnoTotales = {}; // key → { efectivo, yape, esHoy }

  const obtenerOCrearTurno = async (diasAtras, usuario) => {
    const key = `${diasAtras}-${usuario.id}`;
    if (turnoMap[key]) return turnoMap[key];

    const turno = await Turno.create({
      usuario_id:     usuario.id,
      monto_apertura: MONTO_APERTURA,
      estado:         'Abierto',
      fecha_apertura: hace(diasAtras, 8, 0),
    });
    await MovimientoCaja.create({
      turno_id:    turno.id,
      tipo:        'Apertura',
      descripcion: 'Apertura de turno',
      metodo:      'Efectivo',
      monto:       MONTO_APERTURA,
      usuario_id:  usuario.id,
      createdAt:   hace(diasAtras, 8, 0),
    });
    turnoMap[key]     = turno;
    turnoTotales[key] = { efectivo: MONTO_APERTURA, yape: 0, esHoy: diasAtras === 0 };
    return turno;
  };

  let countVentas = 0;
  for (const combo of combos) {
    const [diasAtras, hora, usuario, metodoPago, tipoComprobante, items, montoRecibido, , ruc, razonSocial, direccion] = combo;

    let montoTotal = 0;
    const detallesData = [];
    let valid = true;

    for (const [nombreProd, cantidad] of items) {
      const prod = prodMap[nombreProd];
      if (!prod) { console.warn(`  ⚠ Producto no encontrado: ${nombreProd}`); valid = false; break; }
      const subtotal = parseFloat((prod.precio * cantidad).toFixed(2));
      montoTotal += subtotal;
      detallesData.push({ producto_id: prod.id, cantidad, precio_unitario: prod.precio, subtotal });
    }
    if (!valid) continue;

    montoTotal = parseFloat(montoTotal.toFixed(2));
    const vuelto = metodoPago === 'Efectivo' && montoRecibido
      ? parseFloat((montoRecibido - montoTotal).toFixed(2))
      : null;

    const venta = await Venta.create({
      usuario_id:           usuario.id,
      metodo_pago:          metodoPago,
      monto_total:          montoTotal,
      monto_recibido:       metodoPago === 'Efectivo' ? montoRecibido || montoTotal : null,
      monto_yape:           metodoPago === 'Yape' ? montoTotal : null,
      vuelto,
      tipo_comprobante:     tipoComprobante,
      cliente_ruc:          ruc || null,
      cliente_razon_social: razonSocial || null,
      cliente_direccion:    direccion || null,
      yape_verificado:      metodoPago === 'Yape',
      yape_verificado_por:  metodoPago === 'Yape' ? usuario.id : null,
      yape_verificado_en:   metodoPago === 'Yape' ? hace(diasAtras, hora) : null,
      createdAt:            hace(diasAtras, hora),
    });

    await DetalleVenta.bulkCreate(detallesData.map((d) => ({ ...d, venta_id: venta.id })));

    const turno = await obtenerOCrearTurno(diasAtras, usuario);
    const key   = `${diasAtras}-${usuario.id}`;

    await MovimientoCaja.create({
      turno_id:    turno.id,
      tipo:        'Venta',
      descripcion: `Venta #${venta.id}`,
      metodo:      metodoPago === 'Efectivo' ? 'Efectivo' : 'Yape',
      monto:       montoTotal,
      venta_id:    venta.id,
      usuario_id:  usuario.id,
      createdAt:   hace(diasAtras, hora),
    });

    if (metodoPago === 'Efectivo') turnoTotales[key].efectivo += montoTotal;
    else                           turnoTotales[key].yape     += montoTotal;

    countVentas++;
  }

  // Cerrar turnos históricos (cuadre perfecto en datos de prueba)
  for (const [key, datos] of Object.entries(turnoTotales)) {
    if (datos.esHoy) continue;
    const [diasStr] = key.split('-');
    const turno = turnoMap[key];
    const esperadoEfectivo = parseFloat(datos.efectivo.toFixed(2));
    const esperadoYape     = parseFloat(datos.yape.toFixed(2));
    turno.estado                  = 'Cerrado';
    turno.fecha_cierre            = hace(parseInt(diasStr, 10), 19, 0);
    turno.monto_esperado_efectivo = esperadoEfectivo;
    turno.monto_esperado_yape     = esperadoYape;
    turno.monto_contado_efectivo  = esperadoEfectivo;
    turno.monto_contado_yape      = esperadoYape;
    turno.diferencia_efectivo     = 0;
    turno.diferencia_yape         = 0;
    await turno.save();
  }

  const turnosHoy      = Object.values(turnoTotales).filter((d) => d.esHoy).length;
  const turnosCerrados = Object.keys(turnoTotales).length - turnosHoy;
  console.log(`  ✓ ${countVentas} ventas`);
  console.log(`  ✓ ${Object.keys(turnoTotales).length} turnos de caja (${turnosCerrados} cerrados, ${turnosHoy} abiertos para hoy)`);
}

async function crearEntradas(prodMap, provMap, admin, almacenero) {
  const entradas = [
    { prod: 'Leche Gloria Evaporada 1L',   prov: 'Gloria S.A.',                  cant: 48, dias: 25, fv: en(360) },
    { prod: 'Inca Kola 500ml',             prov: 'Arca Continental Lindley',     cant: 60, dias: 20, fv: en(365) },
    { prod: 'Coca Cola 500ml',             prov: 'Arca Continental Lindley',     cant: 60, dias: 20, fv: en(365) },
    { prod: 'Arroz Costeño 1kg',           prov: 'Distribuidora Mayorista S.A.', cant: 50, dias: 15, fv: en(730) },
    { prod: 'Detergente Ace 1kg',          prov: 'Alicorp S.A.',                 cant: 30, dias: 10, fv: en(730) },
    { prod: 'Galleta Oreo 100g',           prov: 'Nestlé Perú S.A.',            cant: 40, dias: 8,  fv: en(365) },
    { prod: 'Agua Cielo 500ml',            prov: 'Arca Continental Lindley',     cant: 80, dias: 5,  fv: en(365) },
    { prod: 'Pan Molde Bimbo 500g',        prov: 'Bimbo del Perú S.A.',         cant: 24, dias: 3,  fv: en(14)  },
    { prod: 'Yogurt Gloria Fresa 1L',      prov: 'Gloria S.A.',                  cant: 20, dias: 2,  fv: en(12)  },
    { prod: 'Chocolate Sublime 50g',       prov: 'Nestlé Perú S.A.',            cant: 50, dias: 1,  fv: en(365) },
  ];

  let count = 0;
  for (const e of entradas) {
    const prod = prodMap[e.prod];
    const provId = provMap[e.prov];
    if (!prod || !provId) continue;
    // Decorativo: historial de entradas ya reflejado en el stock actual del producto
    // (su lote inicial ya respalda el stock), por eso cantidad_restante = 0.
    await EntradaMercaderia.create({
      producto_id:      prod.id,
      proveedor_id:     provId,
      cantidad:         e.cant,
      cantidad_restante: 0,
      usuario_id:       e.dias % 2 === 0 ? admin.id : almacenero.id,
      fecha_vencimiento: e.fv,
      createdAt:        hace(e.dias),
    });
    count++;
  }
  console.log(`  ✓ ${count} entradas de mercadería`);
}

async function crearBajas(prodMap, admin, almacenero) {
  const bajas = [
    { prod: 'Yogurt Gloria Natural 1L',  cant: 2,  motivo: 'Vencido',  detalle: 'Retirado de anaquel',              dias: 3,  usuario: almacenero },
    { prod: 'Leche Gloria Fresca 1L',    cant: 1,  motivo: 'Vencido',  detalle: 'Fecha de vencimiento próxima — donación', dias: 2,  usuario: almacenero },
    { prod: 'Mantequilla Gloria 200g',   cant: 1,  motivo: 'Dañado',   detalle: 'Daño en empaque durante descarga', dias: 5,  usuario: admin },
    { prod: 'Avena Tres Ositos 500g',    cant: 2,  motivo: 'Dañado',   detalle: 'Merma por humedad en almacén',     dias: 7,  usuario: almacenero },
    { prod: 'Jugo Pulp Naranja 1L',      cant: 1,  motivo: 'Dañado',   detalle: 'Producto golpeado — rotura de envase', dias: 1,  usuario: almacenero },
  ];

  let count = 0;
  for (const b of bajas) {
    const prod = prodMap[b.prod];
    if (!prod) continue;
    await BajaInventario.create({
      producto_id: prod.id,
      cantidad:    b.cant,
      motivo:      b.motivo,
      motivo_detalle: b.detalle,
      usuario_id:  b.usuario.id,
      createdAt:   hace(b.dias),
    });
    count++;
  }
  console.log(`  ✓ ${count} bajas de inventario`);
}

async function crearSolicitudes(prodMap, provMap, almacenero, admin) {
  const solicitudes = [
    // Pendientes — esperando aprobación
    { prod: 'Aceite Primor 1L',          prov: 'Distribuidora Mayorista S.A.', cant: 24, estado: 'Pendiente',   dias: 1,  solicitante: almacenero },
    { prod: 'Avena Tres Ositos 500g',    prov: 'Distribuidora Mayorista S.A.', cant: 48, estado: 'Pendiente',   dias: 0,  solicitante: almacenero },
    { prod: 'Jabón Antibacterial Protex 125g', prov: 'Alicorp S.A.',           cant: 36, estado: 'Pendiente',   dias: 0,  solicitante: almacenero },

    // Aprobadas — pendiente de recepción
    { prod: 'Desodorante Axe 150ml',     prov: 'Colgate-Palmolive Perú',      cant: 24, estado: 'Aprobada',    dias: 5,  solicitante: almacenero, aprobador: admin, fechaEst: en(3) },
    { prod: 'Mantequilla Gloria 200g',   prov: 'Gloria S.A.',                  cant: 12, estado: 'Aprobada',    dias: 3,  solicitante: almacenero, aprobador: admin, fechaEst: en(5) },

    // Rechazada
    { prod: 'Shampoo Sedal 400ml',       prov: 'Alicorp S.A.',                 cant: 24, estado: 'Rechazada',   dias: 8,  solicitante: almacenero, aprobador: admin, motivo: 'Stock suficiente según conteo físico, no procede la reposición' },

    // Completadas — mercadería ya recibida
    { prod: 'Leche Gloria Evaporada 1L', prov: 'Gloria S.A.',                  cant: 48, estado: 'Completada',  dias: 26, solicitante: almacenero, aprobador: admin, fechaEst: en(-22) },
    { prod: 'Arroz Costeño 1kg',         prov: 'Distribuidora Mayorista S.A.', cant: 50, estado: 'Completada',  dias: 16, solicitante: almacenero, aprobador: admin, fechaEst: en(-12) },
  ];

  let count = 0;
  for (const s of solicitudes) {
    const prod = prodMap[s.prod];
    const provId = provMap[s.prov];
    if (!prod || !provId) continue;
    await SolicitudReposicion.create({
      producto_id:            prod.id,
      proveedor_id:           provId,
      cantidad:               s.cant,
      estado:                 s.estado,
      usuario_solicitante_id: s.solicitante.id,
      usuario_aprobador_id:   s.aprobador ? s.aprobador.id : null,
      motivo_rechazo:         s.motivo || null,
      fecha_estimada:         s.fechaEst || null,
      createdAt:              hace(s.dias),
    });
    count++;
  }
  console.log(`  ✓ ${count} solicitudes de reposición`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos\n');

    // Obtener usuarios (deben existir antes de correr este script)
    const admin      = await Usuario.findOne({ where: { rol: 'Administrador' } });
    const vendedor   = await Usuario.findOne({ where: { email: 'vendedor@minimarket.com' } });
    const almacenero = await Usuario.findOne({ where: { email: 'almacenero@minimarket.com' } });

    if (!admin || !vendedor || !almacenero) {
      console.error('❌ Faltan usuarios. Ejecuta primero: cd server && npm run seed:datos\n');
      console.error('   Necesarios: admin@minimarket.com, vendedor@minimarket.com, almacenero@minimarket.com');
      process.exit(1);
    }

    console.log('📦 Creando categorías, proveedores y productos...');
    const { provMap, prodMap } = await crearMaestros(admin);

    console.log('\n🧾 Creando ventas históricas (últimos 30 días)...');
    await crearVentas(prodMap, admin, vendedor);

    console.log('\n📥 Creando entradas de mercadería...');
    await crearEntradas(prodMap, provMap, admin, almacenero);

    console.log('\n🗑️  Creando bajas de inventario...');
    await crearBajas(prodMap, admin, almacenero);

    console.log('\n📋 Creando solicitudes de reposición...');
    await crearSolicitudes(prodMap, provMap, almacenero, admin);

    console.log('\n🎉 Datos de prueba cargados correctamente.');
    console.log('   Módulos listos: Ventas, Caja, Inventario, Solicitudes, Reportes, Dashboard');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.errors) err.errors.forEach((e) => console.error('  -', e.message));
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
