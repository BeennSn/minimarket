/**
 * regenerar_datos.js
 * Borra todo el historial y catálogo (todo menos usuarios y configuración) y
 * lo vuelve a generar simulando ~40 días de operación real y coherente:
 * turnos de caja, ventas con consumo FEFO real de lotes, compras a
 * proveedores, bajas, ajustes de inventario, solicitudes de reposición y
 * accesos — todo atribuido a los usuarios reales existentes en su rol.
 *
 * Reutiliza la misma lógica de servicios/controladores (vía copias con fecha
 * inyectable) para que, al terminar, se cumplan los mismos invariantes que
 * produce el sistema real (stock === suma de cantidad_restante de sus lotes,
 * correlativos de comprobante consecutivos, caja cuadrada, etc).
 *
 * Uso: node server/scripts/regenerar_datos.js   (desde la raíz del proyecto)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Op } = require('sequelize');
const {
  sequelize, Usuario, Categoria, Proveedor, Cliente, Producto,
  Venta, DetalleVenta, EntradaMercaderia, ConsumoLote, BajaInventario,
  AjusteInventario, SolicitudReposicion, LogAcceso, Configuracion,
  Turno, MovimientoCaja,
} = require('../models');

const DIAS_HISTORIA = 40;
const HOY = new Date();

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function fechaHace(diasAtras, hora = 10, minuto = 0) {
  const d = new Date(HOY);
  d.setDate(d.getDate() - diasAtras);
  d.setHours(hora, minuto, Math.floor(Math.random() * 60), 0);
  return d;
}

function soloFecha(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(d);
}

function sumarDiasStr(d, dias) {
  const copia = new Date(d);
  copia.setDate(copia.getDate() + dias);
  return soloFecha(copia);
}

const azar = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const elegir = (arr) => arr[azar(0, arr.length - 1)];
const round2 = (n) => Math.round(n * 100) / 100;

let contadorLote = 0;
function codigoLote(fecha) {
  contadorLote++;
  const f = soloFecha(fecha).replace(/-/g, '');
  return `L-${f}-${String(contadorLote).padStart(4, '0')}`;
}

const referenciasUsadas = new Set();
function nuevaReferenciaPago() {
  let ref;
  do {
    ref = String(azar(100000, 999999));
  } while (referenciasUsadas.has(ref));
  referenciasUsadas.add(ref);
  return ref;
}

// ─── Copias de inventario.service.js con fecha inyectable ─────────────────────
// (el servicio real siempre usa "ahora"; acá se necesita poder backdatar los
// registros para simular meses de historia, así que se reimplementa la misma
// lógica con un parámetro de fecha explícito.)

async function crearLoteFecha({ producto_id, proveedor_id, cantidad, fecha_vencimiento, usuario_id, solicitud_id, ajuste_id, costo_unitario, fecha }, t) {
  const lote = await EntradaMercaderia.create({
    producto_id,
    proveedor_id: proveedor_id || null,
    cantidad,
    cantidad_restante: cantidad,
    usuario_id,
    solicitud_id: solicitud_id || null,
    ajuste_id: ajuste_id || null,
    fecha_vencimiento: fecha_vencimiento || null,
    costo_unitario: costo_unitario ?? null,
    codigo_lote: codigoLote(fecha),
    createdAt: fecha,
    updatedAt: fecha,
  }, { transaction: t });

  const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
  if (costo_unitario != null) {
    const stockActual = producto.stock;
    if (stockActual > 0 && producto.costo_promedio != null) {
      producto.costo_promedio = parseFloat(
        ((stockActual * parseFloat(producto.costo_promedio) + cantidad * parseFloat(costo_unitario)) / (stockActual + cantidad)).toFixed(4)
      );
    } else {
      producto.costo_promedio = parseFloat(costo_unitario);
    }
  }
  producto.stock += cantidad;
  await producto.save({ transaction: t });
  return lote;
}

async function consumirStockFIFOFecha({ producto_id, cantidad, tipo, referencia = {}, soloVigente = false, soloVencido = false, entrada_id = null, fecha, fechaCorte }, t) {
  const where = { producto_id, cantidad_restante: { [Op.gt]: 0 } };
  if (entrada_id) {
    where.id = entrada_id;
  } else if (soloVencido) {
    where.fecha_vencimiento = { [Op.ne]: null, [Op.lte]: fechaCorte };
  } else if (soloVigente) {
    where[Op.or] = [{ fecha_vencimiento: null }, { fecha_vencimiento: { [Op.gt]: fechaCorte } }];
  }

  const lotes = await EntradaMercaderia.findAll({
    where,
    order: [['fecha_vencimiento', 'ASC NULLS LAST'], ['createdAt', 'ASC'], ['id', 'ASC']],
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  let restante = cantidad;
  const consumosData = [];
  for (const lote of lotes) {
    if (restante <= 0) break;
    const tomar = Math.min(lote.cantidad_restante, restante);
    lote.cantidad_restante -= tomar;
    await lote.save({ transaction: t });
    consumosData.push({
      entrada_id: lote.id,
      cantidad: tomar,
      tipo,
      detalle_venta_id: referencia.detalle_venta_id || null,
      baja_id: referencia.baja_id || null,
      ajuste_id: referencia.ajuste_id || null,
      createdAt: fecha,
    });
    restante -= tomar;
  }
  if (restante > 0) {
    throw new Error(`stock_insuficiente:${producto_id}`);
  }
  await ConsumoLote.bulkCreate(consumosData, { transaction: t });
  const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
  producto.stock -= cantidad;
  await producto.save({ transaction: t });
  return consumosData;
}

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

const CLIENTES = [
  { nombre: 'Rosa Elena Quispe Mamani',    dni: '45678912', email: 'rosa.quispe@gmail.com' },
  { nombre: 'Jorge Luis Fernández Vega',   dni: '41234567', email: 'jorge.fernandez@gmail.com' },
  { nombre: 'María Isabel Torres Ramos',   dni: '48765432', email: null },
  { nombre: 'Carlos Alberto Mendoza Ruiz', dni: '44567891', email: 'carlos.mendoza@hotmail.com' },
  { nombre: 'Lucía Fiorella Castro Paredes', dni: '47891234', email: null },
  { nombre: 'Miguel Ángel Huamán Soto',    dni: '43219876', email: 'miguel.huaman@gmail.com' },
  { nombre: 'Ana Patricia Rojas Delgado',  dni: '46543219', email: null },
  { nombre: 'Renato Alexander Salazar Cruz', dni: '42109876', email: 'renato.salazar@gmail.com' },
];

// vida: días de vida útil desde que se compra; pop: peso de popularidad
// (mayor = se vende y se repone más seguido). manejaVenc:false para
// productos que no manejan fecha de vencimiento.
const PRODUCTOS = [
  { nombre: 'Leche Gloria Evaporada 1L',       marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 4.50,  cod: '7750010001001', vida: 300, pop: 5 },
  { nombre: 'Leche Gloria Fresca 1L',          marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 5.20,  cod: '7750010003005', vida: 10,  pop: 3 },
  { nombre: 'Leche Ideal Cremosita 500ml',     marca: 'Ideal',        cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 3.80,  cod: '7750020001009', vida: 300, pop: 3 },
  { nombre: 'Yogurt Gloria Fresa 1L',          marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 7.50,  cod: '7750030002002', vida: 20,  pop: 3 },
  { nombre: 'Yogurt Gloria Natural 1L',        marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 7.50,  cod: '7750030001005', vida: 20,  pop: 2 },
  { nombre: 'Mantequilla Gloria 200g',         marca: 'Gloria',       cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 6.90,  cod: '7750040001001', vida: 120, pop: 2 },
  { nombre: 'Queso Fresco 250g',               marca: 'Laive',        cat: 'Lácteos',     prov: 'Gloria S.A.',                  precio: 8.50,  cod: '7750050001008', vida: 15,  pop: 2 },

  { nombre: 'Inca Kola 500ml',                 marca: 'Inca Kola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  cod: '7750060001004', vida: 300, pop: 5 },
  { nombre: 'Inca Kola 2.25L',                 marca: 'Inca Kola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 8.00,  cod: '7750060002001', vida: 300, pop: 3 },
  { nombre: 'Coca Cola 500ml',                 marca: 'Coca Cola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  cod: '7750070001000', vida: 300, pop: 5 },
  { nombre: 'Coca Cola 2.25L',                 marca: 'Coca Cola',    cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 8.00,  cod: '7750070002007', vida: 300, pop: 3 },
  { nombre: 'Sprite 500ml',                    marca: 'Sprite',       cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 2.50,  cod: '7750080001007', vida: 300, pop: 3 },
  { nombre: 'Agua Cielo 500ml',                marca: 'Cielo',        cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 1.50,  cod: '7750100001002', vida: 300, pop: 5 },
  { nombre: 'Agua Cielo 2L',                    marca: 'Cielo',        cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 3.00,  cod: '7750100002009', vida: 300, pop: 3 },
  { nombre: 'Energizante Monster 473ml',        marca: 'Monster',      cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 6.00,  cod: '7750110002006', vida: 300, pop: 2 },
  { nombre: 'Jugo Pulp Naranja 1L',            marca: 'Pulp',         cat: 'Bebidas',     prov: 'Arca Continental Lindley',     precio: 5.50,  cod: '7750120001005', vida: 30,  pop: 2 },

  { nombre: 'Arroz Costeño 1kg',               marca: 'Costeño',      cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.80,  cod: '7750200001005', vida: 500, pop: 4 },
  { nombre: 'Arroz Costeño 5kg',               marca: 'Costeño',      cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 17.50, cod: '7750200002002', vida: 500, pop: 2 },
  { nombre: 'Azúcar Rubia Cartavio 1kg',       marca: 'Cartavio',     cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.50,  cod: '7750210001001', vida: 500, pop: 3 },
  { nombre: 'Fideos Don Vittorio Spaghetti 500g', marca: 'Don Vittorio', cat: 'Abarrotes', prov: 'Distribuidora Mayorista S.A.', precio: 2.20, cod: '7750220001008', vida: 500, pop: 3 },
  { nombre: 'Aceite Primor 1L',                marca: 'Primor',       cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 7.50,  cod: '7750230001004', vida: 500, pop: 3 },
  { nombre: 'Sal Marina Emsal 1kg',            marca: 'Emsal',        cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 1.50,  cod: '7750240001000', vida: 500, pop: 2 },
  { nombre: 'Avena Tres Ositos 500g',          marca: 'Tres Ositos',  cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 4.00,  cod: '7750260001003', vida: 270, pop: 2 },
  { nombre: 'Harina Blanca Flor 1kg',          marca: 'Blanca Flor',  cat: 'Abarrotes',   prov: 'Distribuidora Mayorista S.A.', precio: 3.50,  cod: '7750270001000', vida: 270, pop: 2 },

  { nombre: 'Detergente Ace 1kg',              marca: 'Ace',          cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 8.50,  cod: '7750300001007', vida: 540, pop: 3 },
  { nombre: 'Lavavajillas Ayudín 500ml',       marca: 'Ayudín',       cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 7.00,  cod: '7750310001003', vida: 540, pop: 2 },
  { nombre: 'Lejía Clorox 1L',                 marca: 'Clorox',       cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 4.00,  cod: '7750330001006', vida: 540, pop: 3 },
  { nombre: 'Papel Higiénico Suave 4und',      marca: 'Suave',        cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 6.00,  cod: '7750340001002', pop: 4, manejaVenc: false },
  { nombre: 'Pilas Duracell AA x2',            marca: 'Duracell',     cat: 'Limpieza',    prov: 'Alicorp S.A.',                 precio: 9.00,  cod: '7750350009001', pop: 1, manejaVenc: false },

  { nombre: 'Shampoo Sedal 400ml',             marca: 'Sedal',        cat: 'Cuidado Personal', prov: 'Alicorp S.A.',            precio: 12.00, cod: '7750400001000', pop: 2, manejaVenc: false },
  { nombre: 'Pasta Dental Colgate 90g',        marca: 'Colgate',      cat: 'Cuidado Personal', prov: 'Colgate-Palmolive Perú',  precio: 5.00,  cod: '7750430001009', pop: 3, manejaVenc: false },
  { nombre: 'Desodorante Axe 150ml',           marca: 'Axe',          cat: 'Cuidado Personal', prov: 'Colgate-Palmolive Perú',  precio: 11.00, cod: '7750420001002', pop: 2, manejaVenc: false },
  { nombre: 'Jabón Antibacterial Protex 125g', marca: 'Protex',       cat: 'Cuidado Personal', prov: 'Alicorp S.A.',            precio: 3.50,  cod: '7750350001009', vida: 540, pop: 3 },

  { nombre: 'Papas Lays 120g',                 marca: 'Lays',         cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 4.50,  cod: '7750500001003', vida: 150, pop: 4 },
  { nombre: 'Doritos 120g',                    marca: 'Doritos',      cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 4.50,  cod: '7750510001000', vida: 150, pop: 3 },
  { nombre: 'Cheetos 100g',                    marca: 'Cheetos',      cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 3.50,  cod: '7750520001006', vida: 150, pop: 3 },
  { nombre: 'Canchita Popcorn 100g',           marca: 'Canchita',     cat: 'Snacks',      prov: 'PepsiCo Alimentos Perú',      precio: 2.50,  cod: '7750530001002', vida: 150, pop: 2 },

  { nombre: 'Chocolate Sublime 50g',           marca: 'Sublime',      cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 2.00,  cod: '7750600001006', vida: 240, pop: 5 },
  { nombre: 'Galleta Oreo 100g',               marca: 'Oreo',         cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 3.00,  cod: '7750630001005', vida: 240, pop: 4 },
  { nombre: 'Galleta Soda Field 200g',         marca: 'Field',        cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 2.50,  cod: '7750640001001', vida: 240, pop: 3 },
  { nombre: 'Caramelos Halls 12und',           marca: 'Halls',        cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 3.00,  cod: '7750620001009', vida: 300, pop: 2 },
  { nombre: 'Mentitas 30g',                    marca: 'Mentitas',     cat: 'Golosinas',   prov: 'Nestlé Perú S.A.',            precio: 1.00,  cod: '7750650001008', vida: 300, pop: 3 },

  { nombre: 'Atún Florida Lomitos 170g',       marca: 'Florida',      cat: 'Conservas',   prov: 'Florida Group Perú',          precio: 5.50,  cod: '7750700001009', vida: 450, pop: 3 },
  { nombre: 'Atún San Andrés 170g',            marca: 'San Andrés',   cat: 'Conservas',   prov: 'Florida Group Perú',          precio: 4.50,  cod: '7750710001005', vida: 450, pop: 2 },
  { nombre: 'Leche Condensada Gloria 400g',    marca: 'Gloria',       cat: 'Conservas',   prov: 'Gloria S.A.',                  precio: 6.50,  cod: '7750730001008', vida: 300, pop: 2 },

  { nombre: 'Ají Molido 50g',                  marca: 'Dos Caballos', cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 2.00,  cod: '7750800001001', vida: 400, pop: 2 },
  { nombre: 'Sillao Maggi 500ml',              marca: 'Maggi',        cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 7.00,  cod: '7750810001008', vida: 400, pop: 2 },
  { nombre: 'Vinagre Tinto 500ml',             marca: "Z'ing",        cat: 'Condimentos', prov: 'Distribuidora Mayorista S.A.', precio: 3.00,  cod: '7750820001004', vida: 400, pop: 1 },

  { nombre: 'Pan Molde Bimbo 500g',            marca: 'Bimbo',        cat: 'Panadería',   prov: 'Bimbo del Perú S.A.',         precio: 7.50,  cod: '7750900001004', vida: 7,   pop: 3 },
  { nombre: 'Pan Integral Bimbo 500g',         marca: 'Bimbo',        cat: 'Panadería',   prov: 'Bimbo del Perú S.A.',         precio: 8.50,  cod: '7750900002001', vida: 7,   pop: 2 },
];

// ─── Limpieza ──────────────────────────────────────────────────────────────────

async function limpiarTodoMenosUsuarios() {
  await sequelize.query(`
    TRUNCATE TABLE
      consumos_lote, movimientos_caja, detalle_ventas, entradas_mercaderia,
      ventas, bajas_inventario, ajustes_inventario, turnos,
      solicitudes_reposicion, logs_acceso, clientes, productos,
      categorias, proveedores
    RESTART IDENTITY CASCADE
  `);
  await sequelize.query(`
    UPDATE configuracion SET correlativo_boleta = 0, correlativo_factura = 0 WHERE id = 1
  `);
  console.log('✓ Base de datos limpiada (usuarios y configuración intactos)');
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  await sequelize.authenticate();
  console.log('✅ Conectado a la base de datos\n');

  await limpiarTodoMenosUsuarios();

  const usuarios = await Usuario.findAll({ raw: true });
  const porEmail = (email) => usuarios.find((u) => u.email === email);
  const porRol = (rol) => usuarios.filter((u) => u.rol === rol);

  const vendedores = [porEmail('sroselg051@gmail.com'), porEmail('vendedor@minimarket.com')].filter(Boolean);
  const almaceneros = [porEmail('marlon.jchavez10@gmail.com'), porEmail('almacenero@minimarket.com')].filter(Boolean);
  const administradores = porRol('Administrador');
  const gerentes = porRol('Gerente');
  const aprobadores = [...administradores, ...gerentes];
  const todosUsuarios = usuarios;

  const pesoVendedor = () => (Math.random() < 0.1 && administradores.length ? elegir(administradores) : elegir(vendedores));
  const pesoAlmacenero = () => (Math.random() < 0.15 && administradores.length ? elegir(administradores) : elegir(almaceneros));

  // ─── Maestros ────────────────────────────────────────────────────────────
  const fechaInicioHistoria = fechaHace(DIAS_HISTORIA + 5, 9, 0);

  const catMap = {};
  for (const nombre of CATEGORIAS) {
    const cat = await Categoria.create({ nombre, createdAt: fechaInicioHistoria, updatedAt: fechaInicioHistoria });
    catMap[nombre] = cat.id;
  }
  console.log(`✓ ${CATEGORIAS.length} categorías`);

  const provMap = {};
  for (const p of PROVEEDORES) {
    const prov = await Proveedor.create({ ...p, createdAt: fechaInicioHistoria, updatedAt: fechaInicioHistoria });
    provMap[p.nombre] = prov.id;
  }
  console.log(`✓ ${PROVEEDORES.length} proveedores`);

  const clienteMap = {};
  for (const c of CLIENTES) {
    const cli = await Cliente.create({ ...c, createdAt: fechaInicioHistoria, updatedAt: fechaInicioHistoria });
    clienteMap[c.dni] = cli.id;
  }
  console.log(`✓ ${CLIENTES.length} clientes`);

  const productos = [];
  for (const p of PRODUCTOS) {
    const manejaVenc = p.manejaVenc !== false;
    const prod = await Producto.create({
      nombre: p.nombre,
      marca: p.marca,
      categoria_id: catMap[p.cat],
      proveedor_id: provMap[p.prov],
      precio: p.precio,
      stock: 0,
      codigo_barras: p.cod,
      activo: true,
      maneja_vencimiento: manejaVenc,
      createdAt: fechaInicioHistoria,
      updatedAt: fechaInicioHistoria,
    });
    productos.push({ ...p, id: prod.id, manejaVenc, proveedorId: provMap[p.prov] });
  }
  console.log(`✓ ${productos.length} productos`);

  // ─── Stock inicial (lote de apertura, ~65 días atrás) ───────────────────
  const diaApertura = DIAS_HISTORIA + 5;
  for (const p of productos) {
    const cantidad = p.pop * azar(10, 16);
    const fechaCompra = fechaHace(diaApertura, 8, 30);
    const fv = p.manejaVenc ? sumarDiasStr(fechaCompra, p.vida) : null;
    await sequelize.transaction((t) => crearLoteFecha({
      producto_id: p.id,
      proveedor_id: p.proveedorId,
      cantidad,
      fecha_vencimiento: fv,
      usuario_id: pesoAlmacenero().id,
      costo_unitario: round2(p.precio * 0.6),
      fecha: fechaCompra,
    }, t));
    p.proximoRestock = diaApertura - azar(6, 16);
  }
  console.log('✓ Stock inicial cargado con lotes reales\n');

  // ─── Simulación día por día (de más antiguo a hoy) ──────────────────────
  let totalVentas = 0, totalEntradas = 0, totalBajas = 0, totalAjustes = 0, totalLogs = 0, totalAnulaciones = 0;
  const solicitudesPendientesInfo = [];

  for (let dia = DIAS_HISTORIA; dia >= 0; dia--) {
    const fechaCorte = soloFecha(fechaHace(dia, 12, 0));

    // Restocking programado
    for (const p of productos) {
      if (dia <= p.proximoRestock) {
        const cantidad = p.pop * azar(6, 12);
        const fechaCompra = fechaHace(dia, azar(8, 11), azar(0, 59));
        const fv = p.manejaVenc ? sumarDiasStr(fechaCompra, p.vida) : null;
        try {
          await sequelize.transaction((t) => crearLoteFecha({
            producto_id: p.id,
            proveedor_id: p.proveedorId,
            cantidad,
            fecha_vencimiento: fv,
            usuario_id: pesoAlmacenero().id,
            costo_unitario: round2(p.precio * 0.6),
            fecha: fechaCompra,
          }, t));
          totalEntradas++;
        } catch (e) { /* ignorar y reintentar el próximo ciclo */ }
        p.proximoRestock = dia - azar(9, 20);
      }
    }

    // Turno de caja del día
    const cajero = pesoVendedor();
    const turno = await Turno.create({
      usuario_id: cajero.id,
      monto_apertura: 500,
      estado: 'Abierto',
      fecha_apertura: fechaHace(dia, 8, 0),
    });
    await MovimientoCaja.create({
      turno_id: turno.id, tipo: 'Apertura', descripcion: 'Apertura de turno',
      metodo: 'Efectivo', monto: 500, usuario_id: cajero.id,
      createdAt: fechaHace(dia, 8, 0),
    });

    const numVentas = azar(3, 6);
    const ventasDelDia = [];
    for (let i = 0; i < numVentas; i++) {
      const horaVenta = fechaHace(dia, azar(9, 20), azar(0, 59));
      const nItems = azar(1, 4);
      const itemsElegidos = [];
      for (let j = 0; j < nItems; j++) {
        const pool = productos.filter((p) => !itemsElegidos.some((it) => it.id === p.id));
        if (!pool.length) break;
        const pesos = pool.flatMap((p) => Array(p.pop).fill(p));
        itemsElegidos.push(elegir(pesos));
      }

      try {
        const venta = await sequelize.transaction(async (t) => {
          let montoTotal = 0;
          const detallesData = [];
          for (const prodInfo of itemsElegidos) {
            const cantidad = azar(1, 3);
            const subtotal = round2(prodInfo.precio * cantidad);
            montoTotal += subtotal;
            detallesData.push({ producto_id: prodInfo.id, cantidad, precio_unitario: prodInfo.precio, subtotal });
          }
          montoTotal = round2(montoTotal);

          const metodoPago = Math.random() < 0.55 ? 'Efectivo' : 'Yape';
          const tipoComprobante = Math.random() < 0.92 ? 'Boleta' : 'Factura';
          const conCliente = tipoComprobante === 'Boleta' && Math.random() < 0.35;
          const clienteElegido = conCliente ? elegir(CLIENTES) : null;

          let config = await Configuracion.findByPk(1, { transaction: t, lock: t.LOCK.UPDATE });
          const campoCorrelativo = tipoComprobante === 'Factura' ? 'correlativo_factura' : 'correlativo_boleta';
          config[campoCorrelativo] = (config[campoCorrelativo] || 0) + 1;
          await config.save({ transaction: t });

          const montoRecibido = metodoPago === 'Efectivo' ? Math.ceil(montoTotal / 5) * 5 + (Math.random() < 0.3 ? 5 : 0) : null;
          const vuelto = metodoPago === 'Efectivo' ? round2(montoRecibido - montoTotal) : null;

          const nuevaVenta = await Venta.create({
            usuario_id: cajero.id,
            cliente_id: clienteElegido ? clienteMap[clienteElegido.dni] : null,
            turno_id: turno.id,
            metodo_pago: metodoPago,
            monto_total: montoTotal,
            monto_recibido: montoRecibido,
            monto_yape: metodoPago === 'Yape' ? montoTotal : null,
            vuelto,
            tipo_comprobante: tipoComprobante,
            numero_comprobante: config[campoCorrelativo],
            serie_comprobante: tipoComprobante === 'Factura' ? config.serie_factura : config.serie_boleta,
            cliente_dni: clienteElegido ? clienteElegido.dni : null,
            cliente_ruc: tipoComprobante === 'Factura' ? '20512345678' : null,
            cliente_razon_social: tipoComprobante === 'Factura' ? 'Comercial Andina S.A.C.' : null,
            cliente_direccion: tipoComprobante === 'Factura' ? 'Av. Los Próceres 450, Lima' : null,
            yape_verificado: metodoPago === 'Yape',
            yape_verificado_por: metodoPago === 'Yape' ? cajero.id : null,
            yape_verificado_en: metodoPago === 'Yape' ? horaVenta : null,
            referencia_pago: metodoPago === 'Yape' ? nuevaReferenciaPago() : null,
            createdAt: horaVenta,
            updatedAt: horaVenta,
          }, { transaction: t });

          const detalles = await DetalleVenta.bulkCreate(
            detallesData.map((d) => ({ ...d, venta_id: nuevaVenta.id, createdAt: horaVenta, updatedAt: horaVenta })),
            { transaction: t, returning: true }
          );

          for (const detalle of detalles) {
            await consumirStockFIFOFecha({
              producto_id: detalle.producto_id,
              cantidad: detalle.cantidad,
              tipo: 'Venta',
              referencia: { detalle_venta_id: detalle.id },
              soloVigente: true,
              fecha: horaVenta,
              fechaCorte,
            }, t);
          }

          await MovimientoCaja.create({
            turno_id: turno.id, tipo: 'Venta', descripcion: `Venta #${nuevaVenta.id}`,
            metodo: metodoPago, monto: montoTotal, venta_id: nuevaVenta.id,
            usuario_id: cajero.id, createdAt: horaVenta,
          }, { transaction: t });

          return nuevaVenta;
        });
        ventasDelDia.push(venta);
        totalVentas++;
      } catch (e) {
        if (!String(e.message).startsWith('stock_insuficiente')) throw e;
      }
    }

    // Anulación ocasional de una venta del día (devolución con o sin reposición)
    if (ventasDelDia.length && Math.random() < 0.06) {
      const ventaAnular = elegir(ventasDelDia);
      try {
        await sequelize.transaction(async (t) => {
          const detalles = await DetalleVenta.findAll({ where: { venta_id: ventaAnular.id }, transaction: t });
          const movVenta = await MovimientoCaja.findOne({ where: { venta_id: ventaAnular.id, tipo: 'Venta' }, transaction: t });
          const horaAnulacion = fechaHace(dia, azar(10, 21), azar(0, 59));
          for (const detalle of detalles) {
            const consumos = await ConsumoLote.findAll({ where: { tipo: 'Venta', detalle_venta_id: detalle.id }, transaction: t });
            for (const consumo of consumos) {
              const lote = await EntradaMercaderia.findByPk(consumo.entrada_id, { transaction: t, lock: t.LOCK.UPDATE });
              if (lote) {
                lote.cantidad_restante += consumo.cantidad;
                await lote.save({ transaction: t });
              }
              await consumo.destroy({ transaction: t });
            }
            const producto = await Producto.findByPk(detalle.producto_id, { transaction: t, lock: t.LOCK.UPDATE });
            producto.stock += detalle.cantidad;
            await producto.save({ transaction: t });
          }
          await ventaAnular.update({
            estado: 'Anulada',
            motivo_anulacion: elegir(['Cliente cambió de opinión', 'Error al cobrar el producto', 'Cliente pidió otro producto por error']),
            anulado_por: cajero.id,
            anulado_en: horaAnulacion,
          }, { transaction: t });
          await MovimientoCaja.create({
            turno_id: turno.id, tipo: 'Anulacion',
            descripcion: `Anulación venta #${ventaAnular.id}`,
            metodo: movVenta.metodo, monto: movVenta.monto, venta_id: ventaAnular.id,
            usuario_id: cajero.id, createdAt: horaAnulacion,
          }, { transaction: t });
        });
        totalAnulaciones++;
      } catch (e) { /* si falla, se deja la venta como estaba */ }
    }

    // Cierre de turno (excepto el de hoy, que se deja abierto para seguir usando el sistema)
    if (dia > 0) {
      const movimientos = await MovimientoCaja.findAll({ where: { turno_id: turno.id } });
      let efectivo = 0, yape = 0;
      for (const m of movimientos) {
        const monto = parseFloat(m.monto);
        if (m.tipo === 'Anulacion') { if (m.metodo === 'Efectivo') efectivo -= monto; else yape -= monto; }
        else if (m.metodo === 'Efectivo') efectivo += monto;
        else if (m.metodo === 'Yape') yape += monto;
      }
      efectivo = round2(efectivo);
      yape = round2(yape);
      const conDescuadre = Math.random() < 0.12;
      const diffEfectivo = conDescuadre ? elegir([-5, -2, -1, 1, 2, 3]) : 0;
      await turno.update({
        estado: 'Cerrado',
        fecha_cierre: fechaHace(dia, 21, azar(0, 30)),
        monto_esperado_efectivo: efectivo,
        monto_esperado_yape: yape,
        monto_contado_efectivo: round2(efectivo + diffEfectivo),
        monto_contado_yape: yape,
        diferencia_efectivo: diffEfectivo,
        diferencia_yape: 0,
        observaciones: conDescuadre ? 'Pequeña diferencia detectada en el conteo de efectivo' : null,
        aprobado_por: Math.random() < 0.7 && aprobadores.length ? elegir(aprobadores).id : null,
      });
    }

    // Bajas de inventario (cada ~9 días)
    if (dia % 9 === 3) {
      const fechaBaja = fechaHace(dia, azar(9, 18), azar(0, 59));
      const productosConLotes = await EntradaMercaderia.findAll({
        where: { cantidad_restante: { [Op.gt]: 0 }, fecha_vencimiento: { [Op.ne]: null, [Op.lte]: fechaCorte } },
      });
      try {
        if (productosConLotes.length) {
          const lote = elegir(productosConLotes);
          await sequelize.transaction(async (t) => {
            const bajaCreada = await BajaInventario.create({
              producto_id: lote.producto_id,
              cantidad: lote.cantidad_restante,
              motivo: 'Vencido',
              motivo_detalle: 'Retirado de anaquel por vencimiento',
              usuario_id: pesoAlmacenero().id,
              createdAt: fechaBaja, updatedAt: fechaBaja,
            }, { transaction: t });
            await consumirStockFIFOFecha({
              producto_id: lote.producto_id, cantidad: lote.cantidad_restante, tipo: 'Baja',
              referencia: { baja_id: bajaCreada.id }, entrada_id: lote.id, fecha: fechaBaja, fechaCorte,
            }, t);
          });
        } else {
          const p = elegir(productos);
          const lotesVigentes = await EntradaMercaderia.findAll({
            where: { producto_id: p.id, cantidad_restante: { [Op.gt]: 0 } },
            order: [['fecha_vencimiento', 'ASC NULLS LAST']],
          });
          if (lotesVigentes.length) {
            const loteElegido = elegir(lotesVigentes);
            const cantidad = Math.min(loteElegido.cantidad_restante, azar(1, 3));
            await sequelize.transaction(async (t) => {
              const bajaCreada = await BajaInventario.create({
                producto_id: p.id, cantidad,
                motivo: elegir(['Dañado', 'Robo o faltante', 'Error de registro']),
                motivo_detalle: elegir(['Empaque roto durante el acomodo', 'Faltante detectado en conteo de anaquel', 'Registro duplicado por error de digitación']),
                usuario_id: pesoAlmacenero().id,
                createdAt: fechaBaja, updatedAt: fechaBaja,
              }, { transaction: t });
              await consumirStockFIFOFecha({
                producto_id: p.id, cantidad, tipo: 'Baja',
                referencia: { baja_id: bajaCreada.id }, entrada_id: loteElegido.id, fecha: fechaBaja, fechaCorte,
              }, t);
            });
          }
        }
        totalBajas++;
      } catch (e) { /* sin stock disponible ese ciclo, se omite */ }
    }

    // Ajustes de inventario por conteo físico (cada ~14 días)
    if (dia % 14 === 5) {
      const p = elegir(productos);
      const fechaAjuste = fechaHace(dia, azar(15, 19), azar(0, 59));
      try {
        await sequelize.transaction(async (t) => {
          const producto = await Producto.findByPk(p.id, { transaction: t, lock: t.LOCK.UPDATE });
          const diferencia = elegir([-3, -2, -1, 1, 2]);
          const cantidadContada = Math.max(0, producto.stock + diferencia);
          const diferenciaReal = cantidadContada - producto.stock;
          if (diferenciaReal === 0) return;
          const ajusteCreado = await AjusteInventario.create({
            producto_id: p.id,
            cantidad_sistema: producto.stock,
            cantidad_contada: cantidadContada,
            diferencia: diferenciaReal,
            observaciones: diferenciaReal > 0 ? 'Sobrante encontrado en conteo mensual de anaquel' : 'Faltante detectado en conteo mensual de anaquel',
            usuario_id: pesoAlmacenero().id,
            createdAt: fechaAjuste, updatedAt: fechaAjuste,
          }, { transaction: t });
          if (diferenciaReal > 0) {
            await crearLoteFecha({
              producto_id: p.id, proveedor_id: null, cantidad: diferenciaReal,
              fecha_vencimiento: p.manejaVenc ? sumarDiasStr(fechaAjuste, p.vida) : null,
              usuario_id: ajusteCreado.usuario_id, ajuste_id: ajusteCreado.id, fecha: fechaAjuste,
            }, t);
          } else {
            await consumirStockFIFOFecha({
              producto_id: p.id, cantidad: Math.abs(diferenciaReal), tipo: 'Ajuste',
              referencia: { ajuste_id: ajusteCreado.id }, fecha: fechaAjuste, fechaCorte,
            }, t);
          }
        });
        totalAjustes++;
      } catch (e) { /* sin stock suficiente para el faltante simulado, se omite */ }
    }

    // Solicitudes de reposición (cada ~11 días)
    if (dia % 11 === 2) {
      const p = elegir(productos);
      const fechaSolicitud = fechaHace(dia, azar(9, 12), azar(0, 59));
      const solicitante = pesoAlmacenero();
      const solicitud = await SolicitudReposicion.create({
        producto_id: p.id,
        proveedor_id: p.proveedorId,
        cantidad: p.pop * azar(8, 15),
        estado: 'Pendiente',
        usuario_solicitante_id: solicitante.id,
        createdAt: fechaSolicitud, updatedAt: fechaSolicitud,
      });
      solicitudesPendientesInfo.push({ solicitud, dia, producto: p });
    }

    // Resolver solicitudes antiguas (aprobar/rechazar/completar) unos días después de creadas
    for (const info of [...solicitudesPendientesInfo]) {
      if (info.solicitud.estado !== 'Pendiente') continue;
      const diasDesdeCreada = info.dia - dia;
      if (diasDesdeCreada < azar(2, 5)) continue;
      const aprobador = aprobadores.length ? elegir(aprobadores) : pesoAlmacenero();
      const fechaResolucion = fechaHace(dia, azar(9, 17), azar(0, 59));
      if (Math.random() < 0.15) {
        await info.solicitud.update({
          estado: 'Rechazada',
          motivo_rechazo: 'Stock todavía suficiente según el último conteo, no procede la reposición',
          usuario_aprobador_id: aprobador.id,
          updatedAt: fechaResolucion,
        });
      } else {
        await info.solicitud.update({
          estado: 'Aprobada',
          usuario_aprobador_id: aprobador.id,
          fecha_estimada: fechaHace(dia - azar(3, 7)),
          updatedAt: fechaResolucion,
        });
        info.completarEnDia = dia - azar(3, 7);
      }
      info.resuelta = true;
    }
    for (const info of [...solicitudesPendientesInfo]) {
      if (info.solicitud.estado !== 'Aprobada' || info.completada || info.completarEnDia == null) continue;
      if (dia > info.completarEnDia) continue;
      const fechaEntrega = fechaHace(dia, azar(9, 13), azar(0, 59));
      try {
        await sequelize.transaction(async (t) => {
          await info.solicitud.update({ estado: 'Completada', updatedAt: fechaEntrega }, { transaction: t });
          await crearLoteFecha({
            producto_id: info.producto.id,
            proveedor_id: info.producto.proveedorId,
            cantidad: info.solicitud.cantidad,
            fecha_vencimiento: info.producto.manejaVenc ? sumarDiasStr(fechaEntrega, info.producto.vida) : null,
            usuario_id: info.solicitud.usuario_aprobador_id,
            solicitud_id: info.solicitud.id,
            costo_unitario: round2(info.producto.precio * 0.6),
            fecha: fechaEntrega,
          }, t);
        });
        info.completada = true;
        totalEntradas++;
      } catch (e) { /* reintenta el siguiente día */ }
    }

    // Logs de acceso (login/logout) — más frecuentes para roles operativos
    for (const u of todosUsuarios) {
      let probabilidad = 0.08;
      if (u.id === cajero.id) probabilidad = 0.95;
      else if ([...almaceneros].some((a) => a.id === u.id)) probabilidad = 0.5;
      else if (u.rol === 'Gerente' || u.rol === 'Administrador') probabilidad = 0.3;
      if (Math.random() < probabilidad) {
        const horaLogin = fechaHace(dia, azar(8, 10), azar(0, 59));
        await LogAcceso.create({
          usuario_id: u.id, nombre_usuario: u.nombre, rol: u.rol, tipo: 'Login',
          fecha_hora: horaLogin,
        });
        if (dia > 0 && Math.random() < 0.85) {
          await LogAcceso.create({
            usuario_id: u.id, nombre_usuario: u.nombre, rol: u.rol, tipo: 'Logout',
            fecha_hora: fechaHace(dia, azar(19, 21), azar(0, 59)),
          });
        }
        totalLogs++;
      }
    }

    if (dia % 10 === 0) console.log(`  … día -${dia} procesado`);
  }

  console.log('\n📊 Resumen:');
  console.log(`  Ventas:        ${totalVentas} (${totalAnulaciones} anuladas)`);
  console.log(`  Entradas:      ${totalEntradas}`);
  console.log(`  Bajas:         ${totalBajas}`);
  console.log(`  Ajustes:       ${totalAjustes}`);
  console.log(`  Logs de acceso:${totalLogs}`);
  console.log(`  Solicitudes:   ${solicitudesPendientesInfo.length}`);

  // ─── Verificación de invariantes ─────────────────────────────────────────
  const productosFinal = await Producto.findAll({ raw: true });
  let inconsistencias = 0;
  for (const p of productosFinal) {
    const [{ suma }] = await sequelize.query(
      `SELECT COALESCE(SUM(cantidad_restante), 0)::int AS suma FROM entradas_mercaderia WHERE producto_id = :id`,
      { replacements: { id: p.id }, type: sequelize.QueryTypes.SELECT }
    );
    if (Number(suma) !== Number(p.stock)) {
      inconsistencias++;
      console.warn(`  ⚠ Producto ${p.id} (${p.nombre}): stock=${p.stock} pero suma de lotes=${suma}`);
    }
  }
  console.log(inconsistencias === 0
    ? '\n✅ Invariante stock = suma(cantidad_restante) verificado en todos los productos'
    : `\n⚠ ${inconsistencias} producto(s) con descuadre de stock`);

  console.log('\n🎉 Base de datos regenerada con historia coherente de ~' + DIAS_HISTORIA + ' días.');
}

main()
  .catch((err) => { console.error('❌ Error:', err); process.exitCode = 1; })
  .finally(() => sequelize.close());
