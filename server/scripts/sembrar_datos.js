require('dotenv').config();
const { Sequelize } = require('sequelize');
const {
  Categoria, Producto, Proveedor,
} = require('../models');

const seq = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  logging: false,
});

const PROVEEDORES = [
  { nombre: 'Gloria S.A.',                ruc: '20100123456', contacto: 'Ventas Gloria' },
  { nombre: 'Arca Continental Lindley',    ruc: '20200123457', contacto: 'Distribución Lindley' },
  { nombre: 'Distribuidora Mayorista S.A.', ruc: '20300123458', contacto: 'Pedidos Mayorista' },
  { nombre: 'Alicorp S.A.',                ruc: '20400123459', contacto: 'Atención Alicorp' },
  { nombre: 'Colgate-Palmolive Perú',      ruc: '20500123450', contacto: 'Servicio al Cliente' },
  { nombre: 'PepsiCo Alimentos Perú',      ruc: '20600123451', contacto: 'Distribución Snacks' },
  { nombre: 'Nestlé Perú S.A.',            ruc: '20700123452', contacto: 'Ventas Nestlé' },
  { nombre: 'Florida Group Perú',          ruc: '20800123453', contacto: 'Ventas Conservas' },
  { nombre: 'Dos Caballos S.A.',           ruc: '20900123454', contacto: 'Distribución Condimentos' },
  { nombre: 'Bimbo del Perú S.A.',         ruc: '21000123455', contacto: 'Ventas Panificación' },
];

const CATEGORIAS = [
  { nombre: 'Lácteos' },
  { nombre: 'Bebidas' },
  { nombre: 'Abarrotes' },
  { nombre: 'Limpieza' },
  { nombre: 'Cuidado Personal' },
  { nombre: 'Snacks' },
  { nombre: 'Golosinas' },
  { nombre: 'Conservas' },
  { nombre: 'Condimentos' },
  { nombre: 'Panadería' },
];

const _hoy = new Date();
const _s = (dias) => { const d = new Date(_hoy); d.setDate(d.getDate() + dias); return d.toISOString().split('T')[0]; };
const FV = {
  expirado:    _s(-15),   // vencido hace 15 días
  expirado30:  _s(-30),   // vencido hace 30 días
  expirado45:  _s(-45),   // vencido hace 45 días
  porVencer5:  _s(5),     // vence en 5 días
  porVencer12: _s(12),    // vence en 12 días
  porVencer20: _s(20),    // vence en 20 días
  normal:      _s(730),   // ~2 años
};

const PRODUCTOS = [
  // ─── Lácteos → Gloria S.A. ───────────────────────────────────────────────────
  { nombre: 'Leche Gloria Evaporada 1L',         marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 4.50, stock: 60, codigo_barras: '7750010001001', fecha_vencimiento: FV.porVencer5 },
  { nombre: 'Leche Gloria Evaporada 2.5L',       marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 9.80, stock: 40, codigo_barras: '7750010002008', fecha_vencimiento: FV.normal },
  { nombre: 'Leche Gloria Fresca 1L',            marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 5.20, stock: 2,  codigo_barras: '7750010003005', fecha_vencimiento: FV.expirado },
  { nombre: 'Leche Ideal Cremosita 500ml',        marca: 'Ideal',       categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 3.80, stock: 45, codigo_barras: '7750020001009', fecha_vencimiento: FV.porVencer12 },
  { nombre: 'Yogurt Gloria Natural 1L',           marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 7.50, stock: 3,  codigo_barras: '7750030001005', fecha_vencimiento: FV.expirado },
  { nombre: 'Yogurt Gloria Fresa 1L',             marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 7.50, stock: 35, codigo_barras: '7750030002002', fecha_vencimiento: FV.expirado30 },
  { nombre: 'Mantequilla Gloria 200g',            marca: 'Gloria',      categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 6.90, stock: 0,  codigo_barras: '7750040001001', fecha_vencimiento: FV.expirado45 },
  { nombre: 'Queso Fresco Donofrio 250g',         marca: 'Donofrio',    categoria: 'Lácteos',      proveedor: 'Gloria S.A.',                precio: 8.50, stock: 20, codigo_barras: '7750050001008', fecha_vencimiento: FV.expirado },
  { nombre: 'Leche Condensada Gloria 400g',       marca: 'Gloria',      categoria: 'Conservas',    proveedor: 'Gloria S.A.',                precio: 6.50, stock: 30, codigo_barras: '7750730001008', fecha_vencimiento: FV.porVencer20 },

  // ─── Bebidas → Arca Continental Lindley ───────────────────────────────────────
  { nombre: 'Inca Kola 500ml',                   marca: 'Inca Kola',   categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 2.50, stock: 80, codigo_barras: '7750060001004', fecha_vencimiento: FV.normal },
  { nombre: 'Inca Kola 2.25L',                   marca: 'Inca Kola',   categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 8.00, stock: 50, codigo_barras: '7750060002001', fecha_vencimiento: FV.normal },
  { nombre: 'Coca Cola 500ml',                   marca: 'Coca Cola',   categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 2.50, stock: 80, codigo_barras: '7750070001000', fecha_vencimiento: FV.normal },
  { nombre: 'Coca Cola 2.25L',                   marca: 'Coca Cola',   categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 8.00, stock: 50, codigo_barras: '7750070002007', fecha_vencimiento: FV.normal },
  { nombre: 'Sprite 500ml',                      marca: 'Sprite',      categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 2.50, stock: 60, codigo_barras: '7750080001007', fecha_vencimiento: FV.normal },
  { nombre: 'Fanta Naranja 500ml',               marca: 'Fanta',       categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 2.50, stock: 55, codigo_barras: '7750090001003', fecha_vencimiento: FV.normal },
  { nombre: 'Agua Cielo 500ml',                  marca: 'Cielo',       categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 1.50, stock: 100, codigo_barras: '7750100001002', fecha_vencimiento: FV.normal },
  { nombre: 'Agua Cielo 2L',                     marca: 'Cielo',       categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 3.00, stock: 70, codigo_barras: '7750100002009', fecha_vencimiento: FV.normal },
  { nombre: 'Energizante Volting 500ml',          marca: 'Volting',     categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 4.50, stock: 4,  codigo_barras: '7750110001009', fecha_vencimiento: FV.porVencer5 },
  { nombre: 'Energizante Monster 473ml',          marca: 'Monster',     categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 6.00, stock: 35, codigo_barras: '7750110002006', fecha_vencimiento: FV.normal },
  { nombre: 'Jugo Pulp Naranja 1L',              marca: 'Pulp',        categoria: 'Bebidas',      proveedor: 'Arca Continental Lindley',   precio: 5.50, stock: 30, codigo_barras: '7750120001005', fecha_vencimiento: FV.normal },

  // ─── Abarrotes → Distribuidora Mayorista S.A. ─────────────────────────────────
  { nombre: 'Arroz Costeño 1kg',                 marca: 'Costeño',     categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 3.80, stock: 90, codigo_barras: '7750200001005', fecha_vencimiento: FV.normal },
  { nombre: 'Arroz Costeño 5kg',                 marca: 'Costeño',     categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 17.50, stock: 40, codigo_barras: '7750200002002', fecha_vencimiento: FV.normal },
  { nombre: 'Azúcar Rubia Cartavio 1kg',         marca: 'Cartavio',    categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 3.50, stock: 80, codigo_barras: '7750210001001', fecha_vencimiento: FV.normal },
  { nombre: 'Azúcar Blanca Cartavio 1kg',        marca: 'Cartavio',    categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 3.80, stock: 70, codigo_barras: '7750210002008', fecha_vencimiento: FV.normal },
  { nombre: 'Fideos Don Vittorio Spaghetti 500g', marca: 'Don Vittorio', categoria: 'Abarrotes',  proveedor: 'Distribuidora Mayorista S.A.', precio: 2.20, stock: 60, codigo_barras: '7750220001008', fecha_vencimiento: FV.normal },
  { nombre: 'Fideos Don Vittorio Tallarín 500g',  marca: 'Don Vittorio', categoria: 'Abarrotes',  proveedor: 'Distribuidora Mayorista S.A.', precio: 2.20, stock: 60, codigo_barras: '7750220002005', fecha_vencimiento: FV.normal },
  { nombre: 'Aceite Primor 1L',                  marca: 'Primor',      categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 7.50, stock: 5,  codigo_barras: '7750230001004', fecha_vencimiento: FV.normal },
  { nombre: 'Aceite Primor 900ml',               marca: 'Primor',      categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 6.80, stock: 45, codigo_barras: '7750230002001', fecha_vencimiento: FV.normal },
  { nombre: 'Sal Marina Emsal 1kg',              marca: 'Emsal',       categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 1.50, stock: 80, codigo_barras: '7750240001000', fecha_vencimiento: FV.normal },
  { nombre: 'Lentejas 1kg',                      marca: 'Costeño',     categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 4.20, stock: 40, codigo_barras: '7750250001007', fecha_vencimiento: FV.normal },
  { nombre: 'Frijoles Canario 1kg',              marca: 'Costeño',     categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 5.00, stock: 35, codigo_barras: '7750250002004', fecha_vencimiento: FV.normal },
  { nombre: 'Avena Tres Ositos 500g',            marca: 'Tres Ositos', categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 4.00, stock: 1,  codigo_barras: '7750260001003', fecha_vencimiento: FV.normal },
  { nombre: 'Harina Blanca Flor 1kg',            marca: 'Blanca Flor', categoria: 'Abarrotes',    proveedor: 'Distribuidora Mayorista S.A.', precio: 3.50, stock: 45, codigo_barras: '7750270001000', fecha_vencimiento: FV.normal },

  // ─── Limpieza → Alicorp S.A. ──────────────────────────────────────────────────
  { nombre: 'Detergente Ace 1kg',                marca: 'Ace',         categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 8.50, stock: 40, codigo_barras: '7750300001007', fecha_vencimiento: FV.normal },
  { nombre: 'Detergente Bolívar 1kg',            marca: 'Bolívar',     categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 6.50, stock: 35, codigo_barras: '7750300002004', fecha_vencimiento: FV.normal },
  { nombre: 'Lavavajillas Ayudín 500ml',         marca: 'Ayudín',      categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 7.00, stock: 30, codigo_barras: '7750310001003', fecha_vencimiento: FV.normal },
  { nombre: 'Desinfectante Sapolio 1L',          marca: 'Sapolio',     categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 5.50, stock: 25, codigo_barras: '7750320001000', fecha_vencimiento: FV.normal },
  { nombre: 'Lejía Clorox 1L',                   marca: 'Clorox',      categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 4.00, stock: 40, codigo_barras: '7750330001006', fecha_vencimiento: FV.normal },
  { nombre: 'Papel Higiénico Suave 4und',        marca: 'Suave',       categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 6.00, stock: 60, codigo_barras: '7750340001002', fecha_vencimiento: FV.normal },
  { nombre: 'Jabón Antibacterial Protex 125g',    marca: 'Protex',      categoria: 'Limpieza',    proveedor: 'Alicorp S.A.',                precio: 3.50, stock: 50, codigo_barras: '7750350001009', fecha_vencimiento: FV.normal },

  // ─── Cuidado Personal → Colgate-Palmolive & Alicorp ───────────────────────────
  { nombre: 'Shampoo Sedal 400ml',               marca: 'Sedal',       categoria: 'Cuidado Personal', proveedor: 'Alicorp S.A.',             precio: 12.00, stock: 25, codigo_barras: '7750400001000', fecha_vencimiento: FV.normal },
  { nombre: 'Jabón íntimo íntima 200ml',          marca: 'Íntima',      categoria: 'Cuidado Personal', proveedor: 'Alicorp S.A.',             precio: 14.50, stock: 20, codigo_barras: '7750410001006', fecha_vencimiento: FV.normal },
  { nombre: 'Desodorante Axe 150ml',             marca: 'Axe',         categoria: 'Cuidado Personal', proveedor: 'Colgate-Palmolive Perú',    precio: 11.00, stock: 0,  codigo_barras: '7750420001002', fecha_vencimiento: FV.normal },
  { nombre: 'Pasta Dental Colgate 90g',          marca: 'Colgate',     categoria: 'Cuidado Personal', proveedor: 'Colgate-Palmolive Perú',    precio: 5.00, stock: 50, codigo_barras: '7750430001009', fecha_vencimiento: FV.normal },
  { nombre: 'Cepillo Dental Colgate Suave',       marca: 'Colgate',     categoria: 'Cuidado Personal', proveedor: 'Colgate-Palmolive Perú',    precio: 4.50, stock: 40, codigo_barras: '7750430002006', fecha_vencimiento: FV.normal },

  // ─── Snacks → PepsiCo Alimentos Perú ──────────────────────────────────────────
  { nombre: 'Papas Lays 120g',                   marca: 'Lays',        categoria: 'Snacks',       proveedor: 'PepsiCo Alimentos Perú',     precio: 4.50, stock: 50, codigo_barras: '7750500001003', fecha_vencimiento: FV.normal },
  { nombre: 'Papas Lays 240g',                   marca: 'Lays',        categoria: 'Snacks',       proveedor: 'PepsiCo Alimentos Perú',     precio: 8.00, stock: 30, codigo_barras: '7750500002000', fecha_vencimiento: FV.normal },
  { nombre: 'Doritos 120g',                      marca: 'Doritos',     categoria: 'Snacks',       proveedor: 'PepsiCo Alimentos Perú',     precio: 4.50, stock: 45, codigo_barras: '7750510001000', fecha_vencimiento: FV.porVencer12 },
  { nombre: 'Cheetos 100g',                      marca: 'Cheetos',     categoria: 'Snacks',       proveedor: 'PepsiCo Alimentos Perú',     precio: 3.50, stock: 50, codigo_barras: '7750520001006', fecha_vencimiento: FV.normal },
  { nombre: 'Canchita Popcorn 100g',             marca: 'Canchita',    categoria: 'Snacks',       proveedor: 'PepsiCo Alimentos Perú',     precio: 2.50, stock: 40, codigo_barras: '7750530001002', fecha_vencimiento: FV.normal },

  // ─── Golosinas → Nestlé Perú S.A. ─────────────────────────────────────────────
  { nombre: 'Chocolate Sublime 50g',             marca: 'Sublime',     categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 2.00, stock: 80, codigo_barras: '7750600001006', fecha_vencimiento: FV.normal },
  { nombre: 'Chocolate Triángulo 30g',           marca: 'Triángulo',   categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 1.50, stock: 4,  codigo_barras: '7750610001002', fecha_vencimiento: FV.porVencer20 },
  { nombre: 'Caramelos Donofrio 12und',          marca: 'Donofrio',    categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 3.00, stock: 60, codigo_barras: '7750620001009', fecha_vencimiento: FV.normal },
  { nombre: 'Galleta Oreo 100g',                 marca: 'Oreo',        categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 3.00, stock: 50, codigo_barras: '7750630001005', fecha_vencimiento: FV.normal },
  { nombre: 'Galleta Soda Field 200g',           marca: 'Field',       categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 2.50, stock: 55, codigo_barras: '7750640001001', fecha_vencimiento: FV.normal },
  { nombre: 'Mentitas 30g',                      marca: 'Mentitas',    categoria: 'Golosinas',    proveedor: 'Nestlé Perú S.A.',            precio: 1.00, stock: 100, codigo_barras: '7750650001008', fecha_vencimiento: FV.normal },

  // ─── Conservas → Florida Group Perú ───────────────────────────────────────────
  { nombre: 'Atún Florida Lomitos 170g',          marca: 'Florida',     categoria: 'Conservas',   proveedor: 'Florida Group Perú',          precio: 5.50, stock: 40, codigo_barras: '7750700001009', fecha_vencimiento: FV.normal },
  { nombre: 'Atún San Andrés 170g',              marca: 'San Andrés',  categoria: 'Conservas',   proveedor: 'Florida Group Perú',          precio: 4.50, stock: 35, codigo_barras: '7750710001005', fecha_vencimiento: FV.normal },
  { nombre: 'Pimientos Morrones 200g',           marca: 'Don Simón',   categoria: 'Conservas',   proveedor: 'Florida Group Perú',          precio: 6.00, stock: 20, codigo_barras: '7750720001001', fecha_vencimiento: FV.normal },

  // ─── Condimentos → Dos Caballos S.A. ──────────────────────────────────────────
  { nombre: 'Ají Molido 50g',                    marca: 'Dos Caballos', categoria: 'Condimentos', proveedor: 'Dos Caballos S.A.',           precio: 2.00, stock: 40, codigo_barras: '7750800001001', fecha_vencimiento: FV.normal },
  { nombre: 'Comino Molido 40g',                 marca: 'Dos Caballos', categoria: 'Condimentos', proveedor: 'Dos Caballos S.A.',           precio: 2.00, stock: 40, codigo_barras: '7750800002008', fecha_vencimiento: FV.normal },
  { nombre: 'Orégano Entero 20g',                marca: 'Dos Caballos', categoria: 'Condimentos', proveedor: 'Dos Caballos S.A.',           precio: 1.50, stock: 45, codigo_barras: '7750800003005', fecha_vencimiento: FV.normal },
  { nombre: 'Sillao 500ml',                      marca: 'Maggi',       categoria: 'Condimentos', proveedor: 'Distribuidora Mayorista S.A.', precio: 7.00, stock: 25, codigo_barras: '7750810001008', fecha_vencimiento: FV.normal },
  { nombre: 'Vinagre Tinto 500ml',               marca: 'Z ing',       categoria: 'Condimentos', proveedor: 'Distribuidora Mayorista S.A.', precio: 3.00, stock: 30, codigo_barras: '7750820001004', fecha_vencimiento: FV.normal },

  // ─── Panadería → Bimbo del Perú S.A. ──────────────────────────────────────────
  { nombre: 'Pan Molde Bimbo 500g',              marca: 'Bimbo',       categoria: 'Panadería',    proveedor: 'Bimbo del Perú S.A.',         precio: 7.50, stock: 30, codigo_barras: '7750900001004', fecha_vencimiento: FV.normal },
  { nombre: 'Pan Integral Bimbo 500g',            marca: 'Bimbo',       categoria: 'Panadería',   proveedor: 'Bimbo del Perú S.A.',         precio: 8.50, stock: 25, codigo_barras: '7750900002001', fecha_vencimiento: FV.normal },
  { nombre: 'Pan de Molde Familiar 800g',        marca: 'Bimbo',       categoria: 'Panadería',    proveedor: 'Bimbo del Perú S.A.',         precio: 11.00, stock: 5,  codigo_barras: '7750900003008', fecha_vencimiento: FV.normal },
];

async function sembrar() {
  try {
    await seq.authenticate();
    console.log('Conectado a la base de datos');
    await seq.sync({ alter: true });
    console.log('Modelos sincronizados');

    const deleted = await Producto.destroy({ where: {} });
    console.log(`Productos anteriores eliminados: ${deleted}\n`);

    const provMap = {};
    for (const p of PROVEEDORES) {
      const [prov] = await Proveedor.findOrCreate({ where: { ruc: p.ruc }, defaults: p });
      provMap[prov.nombre] = prov.id;
      console.log(`  ✓ Proveedor: ${prov.nombre}`);
    }
    console.log(`  ${PROVEEDORES.length} proveedores creados\n`);

    const catsMap = {};
    for (const c of CATEGORIAS) {
      const [cat] = await Categoria.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
      catsMap[cat.nombre] = cat.id;
      console.log(`  ✓ Categoría: ${cat.nombre}`);
    }
    console.log(`  ${CATEGORIAS.length} categorías creadas\n`);

    let count = 0;
    for (const p of PRODUCTOS) {
      const categoriaId = catsMap[p.categoria];
      const proveedorId = provMap[p.proveedor];
      if (!categoriaId) { console.warn(`  ⚠ Categoría no encontrada para ${p.nombre}, saltando`); continue; }
      if (!proveedorId) { console.warn(`  ⚠ Proveedor no encontrado para ${p.nombre}, saltando`); continue; }

      const prodData = { ...p, categoria_id: categoriaId, proveedor_id: proveedorId };
      delete prodData.categoria;
      delete prodData.proveedor;
      if (!prodData.fecha_vencimiento) {
        const _df = new Date(); _df.setFullYear(_df.getFullYear() + 2);
        prodData.fecha_vencimiento = _df.toISOString().split('T')[0];
      }

      const [producto, created] = await Producto.findOrCreate({
        where: { codigo_barras: p.codigo_barras },
        defaults: prodData,
      });
      if (created) { count++; console.log(`  ✓ ${p.codigo_barras} → ${p.nombre}`); }
      else { console.log(`  → ${p.codigo_barras} ya existe, omitido`); }
    }

    console.log(`\n✅ ${count} productos creados exitosamente`);
    console.log(`📦 Total productos: ${await Producto.count()}`);
    console.log(`🏷️  Total categorías: ${await Categoria.count()}`);
    console.log(`🤝 Total proveedores: ${await Proveedor.count()}`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await seq.close();
  }
}

sembrar();
