/**
 * producto.controller.js
 * Controlador CRUD para la gestión de productos.
 */

const { Op } = require('sequelize');
const { sequelize, Producto, Categoria, Proveedor, EntradaMercaderia } = require('../models');
const { presentarProducto, presentarLista } = require('../presenters/producto.presenter');
const { buscarEnApisExternas } = require('../services/barcodeService');
const { hoyPeru } = require('../utils/fechas');

const UNIDADES_COMPRA = ['Unidad', 'Caja', 'Paquete', 'Docena', 'Otro'];

const INCLUDE = [
  { model: Categoria, as: 'categoria', attributes: ['id', 'nombre'] },
  { model: Proveedor, as: 'proveedor', attributes: ['id', 'nombre', 'ruc'] },
];

// Calcula, para cada producto, la fecha de vencimiento más próxima entre sus
// lotes con stock restante (la columna Producto.fecha_vencimiento ya no existe:
// el vencimiento se deriva siempre de EntradaMercaderia).
const obtenerProximasFechasVencimiento = async (productoIds) => {
  if (!productoIds.length) return new Map();
  const filas = await EntradaMercaderia.findAll({
    attributes: [
      'producto_id',
      [sequelize.fn('MIN', sequelize.col('fecha_vencimiento')), 'proxima_fecha_vencimiento'],
    ],
    where: {
      producto_id: { [Op.in]: productoIds },
      cantidad_restante: { [Op.gt]: 0 },
      fecha_vencimiento: { [Op.ne]: null },
    },
    group: ['producto_id'],
    raw: true,
  });
  return new Map(filas.map((f) => [f.producto_id, f.proxima_fecha_vencimiento]));
};

// Suma, por producto, el stock de lotes NO vencidos (o sin fecha) con
// cantidad_restante > 0. Un lote que vence HOY mismo ya no cuenta como
// vigente (decisión de negocio: no se vende lo que vence hoy). A diferencia
// de Producto.stock (que cuenta todo, incluido lo vencido), esto es lo que
// realmente se puede vender — se usa en el POS para avisar/bloquear antes de
// llegar al backend de la venta.
const obtenerStockVigente = async (productoIds) => {
  if (!productoIds.length) return new Map();
  const filas = await EntradaMercaderia.findAll({
    attributes: [
      'producto_id',
      [sequelize.fn('SUM', sequelize.col('cantidad_restante')), 'stock_vigente'],
    ],
    where: {
      producto_id: { [Op.in]: productoIds },
      cantidad_restante: { [Op.gt]: 0 },
      [Op.or]: [
        { fecha_vencimiento: null },
        { fecha_vencimiento: { [Op.gt]: hoyPeru() } },
      ],
    },
    group: ['producto_id'],
    raw: true,
  });
  return new Map(filas.map((f) => [f.producto_id, parseInt(f.stock_vigente, 10)]));
};

const adjuntarProximasFechas = async (productos) => {
  const [fechas, vigentes] = await Promise.all([
    obtenerProximasFechasVencimiento(productos.map((p) => p.id)),
    obtenerStockVigente(productos.map((p) => p.id)),
  ]);
  for (const p of productos) {
    p.proxima_fecha_vencimiento = fechas.get(p.id) || null;
    p.stock_vigente = vigentes.has(p.id) ? vigentes.get(p.id) : 0;
  }
  return productos;
};

// ─── Listar todos los productos ───────────────────────────────────────────────
const listar = async (req, res) => {
  try {
    const productos = await Producto.findAll({ include: INCLUDE });
    await adjuntarProximasFechas(productos);
    return res.status(200).json(presentarLista(productos));
  } catch (err) {
    console.error('Error en listar productos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Listar solo productos activos (para POS) ─────────────────────────────────
const listarActivos = async (req, res) => {
  try {
    const productos = await Producto.findAll({
      where: { activo: true },
      include: INCLUDE,
    });
    await adjuntarProximasFechas(productos);
    return res.status(200).json(presentarLista(productos));
  } catch (err) {
    console.error('Error en listar productos activos:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Buscar producto por código de barras ─────────────────────────────────────
const buscarPorCodigo = async (req, res) => {
  try {
    const producto = await Producto.findOne({
      where: { codigo_barras: req.params.codigo },
      include: INCLUDE,
    });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado para ese código de barras' });
    }
    await adjuntarProximasFechas([producto]);
    return res.status(200).json(presentarProducto(producto));
  } catch (err) {
    console.error('Error en buscarPorCodigo:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Buscar info de producto en APIs externas (autocompletar registro) ────────
const buscarInfoExterna = async (req, res) => {
  try {
    const { codigo } = req.params;
    if (!codigo || !/^\d{6,14}$/.test(codigo)) {
      return res.status(400).json({ mensaje: 'Código de barras inválido' });
    }

    const existente = await Producto.findOne({ where: { codigo_barras: codigo }, include: INCLUDE });
    if (existente) {
      await adjuntarProximasFechas([existente]);
      return res.status(200).json({ ya_existe: true, producto: presentarProducto(existente) });
    }

    const resultado = await buscarEnApisExternas(codigo);

    if (!resultado.encontrado) {
      return res.status(200).json({
        ya_existe: false,
        encontrado: false,
        nombre: null,
        marca: null,
        categoria_id_sugerido: null,
        imagen_url: null,
      });
    }

    let categoria_id_sugerido = null;
    if (resultado.data.categorias_texto) {
      const categorias = await Categoria.findAll();
      const texto = resultado.data.categorias_texto.toLowerCase();
      const match = categorias.find((c) => texto.includes(c.nombre.toLowerCase()));
      if (match) categoria_id_sugerido = match.id;
    }

    return res.status(200).json({
      ya_existe: false,
      encontrado: true,
      nombre: resultado.data.nombre,
      marca: resultado.data.marca,
      categoria_id_sugerido,
      imagen_url: resultado.data.imagen_url,
    });
  } catch (err) {
    console.error('Error en buscarInfoExterna:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Obtener un producto por ID ───────────────────────────────────────────────
const obtener = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id, {
      include: INCLUDE,
    });
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    await adjuntarProximasFechas([producto]);
    return res.status(200).json(presentarProducto(producto));
  } catch (err) {
    console.error('Error en obtener producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Crear un nuevo producto ──────────────────────────────────────────────────
const crear = async (req, res) => {
  try {
    const { nombre, marca, categoria_id, precio, codigo_barras, stock_minimo, unidad_compra, factor_conversion, maneja_vencimiento } = req.body;

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ mensaje: 'El nombre del producto es requerido' });
    }
    if (!marca || !marca.trim()) {
      return res.status(400).json({ mensaje: 'La marca es requerida' });
    }
    if (precio === undefined || precio === null || parseFloat(precio) <= 0) {
      return res.status(400).json({ mensaje: 'El precio debe ser mayor a 0' });
    }
    if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' && (isNaN(parseInt(stock_minimo, 10)) || parseInt(stock_minimo, 10) < 0)) {
      return res.status(400).json({ mensaje: 'El stock mínimo no puede ser negativo' });
    }
    if (unidad_compra !== undefined && unidad_compra !== null && !UNIDADES_COMPRA.includes(unidad_compra)) {
      return res.status(400).json({ mensaje: 'La unidad de compra no es válida' });
    }
    if (factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== '' && (isNaN(parseInt(factor_conversion, 10)) || parseInt(factor_conversion, 10) < 1)) {
      return res.status(400).json({ mensaje: 'El factor de conversión debe ser al menos 1' });
    }

    const duplicado = await Producto.findOne({ where: { nombre: nombre.trim(), marca: marca.trim() } });
    if (duplicado) {
      return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre y marca' });
    }

    if (codigo_barras) {
      const existe = await Producto.findOne({ where: { codigo_barras } });
      if (existe) {
        return res.status(400).json({ mensaje: 'El código de barras ya está registrado en otro producto' });
      }
    }

    // Verificar que la categoría exista
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    // El producto siempre nace con stock 0: el primer lote (cantidad,
    // proveedor, fecha de vencimiento, costo) se registra aparte vía
    // Inventario → Entradas (registrarEntrada), igual que cualquier reposición
    // posterior — así todo movimiento de stock queda en el historial de
    // EntradaMercaderia desde el día uno, sin excepciones "mágicas" en la
    // creación del producto.
    const productoCreado = await Producto.create({
      nombre,
      marca,
      categoria_id,
      precio,
      stock: 0,
      codigo_barras: codigo_barras || null,
      activo: true,
      stock_minimo: stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' ? parseInt(stock_minimo, 10) : null,
      unidad_compra: unidad_compra || 'Unidad',
      factor_conversion: factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== '' ? parseInt(factor_conversion, 10) : 1,
      maneja_vencimiento: maneja_vencimiento === undefined || maneja_vencimiento === null ? true : !!maneja_vencimiento,
    });

    const productoCompleto = await Producto.findByPk(productoCreado.id, { include: INCLUDE });
    await adjuntarProximasFechas([productoCompleto]);
    return res.status(201).json(presentarProducto(productoCompleto));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en crear producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Actualizar un producto ───────────────────────────────────────────────────
const actualizar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    const { nombre, marca, categoria_id, proveedor_id, precio, codigo_barras, stock_minimo, unidad_compra, factor_conversion, maneja_vencimiento } = req.body;

    const nombreFinal = nombre !== undefined ? nombre.trim() : producto.nombre;
    const marcaFinal  = marca  !== undefined ? marca.trim()  : producto.marca;
    if (nombre !== undefined || marca !== undefined) {
      const duplicado = await Producto.findOne({
        where: { nombre: nombreFinal, marca: marcaFinal, id: { [Op.ne]: producto.id } },
      });
      if (duplicado) {
        return res.status(400).json({ mensaje: 'Ya existe un producto con ese nombre y marca' });
      }
    }

    if (codigo_barras !== undefined) {
      const existe = await Producto.findOne({ where: { codigo_barras, id: { [Op.ne]: producto.id } } });
      if (existe) {
        return res.status(400).json({ mensaje: 'El código de barras ya está registrado en otro producto' });
      }
    }

    if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== '' && (isNaN(parseInt(stock_minimo, 10)) || parseInt(stock_minimo, 10) < 0)) {
      return res.status(400).json({ mensaje: 'El stock mínimo no puede ser negativo' });
    }

    if (unidad_compra !== undefined && unidad_compra !== null && !UNIDADES_COMPRA.includes(unidad_compra)) {
      return res.status(400).json({ mensaje: 'La unidad de compra no es válida' });
    }

    if (factor_conversion !== undefined && factor_conversion !== null && factor_conversion !== '' && (isNaN(parseInt(factor_conversion, 10)) || parseInt(factor_conversion, 10) < 1)) {
      return res.status(400).json({ mensaje: 'El factor de conversión debe ser al menos 1' });
    }

    // Verificar que la categoría exista (si se proporciona)
    if (categoria_id) {
      const categoria = await Categoria.findByPk(categoria_id);
      if (!categoria) {
        return res.status(400).json({ mensaje: 'Categoría no encontrada' });
      }
    }

    // Verificar que el proveedor exista (si se proporciona)
    if (proveedor_id !== undefined) {
      if (proveedor_id) {
        const proveedor = await Proveedor.findByPk(proveedor_id);
        if (!proveedor) {
          return res.status(400).json({ mensaje: 'Proveedor no encontrado' });
        }
      }
      producto.proveedor_id = proveedor_id || null;
    }

    // Actualizar solo los campos recibidos
    if (nombre !== undefined) producto.nombre = nombre;
    if (marca !== undefined) producto.marca = marca;
    if (categoria_id !== undefined) producto.categoria_id = categoria_id;
    if (precio !== undefined) producto.precio = precio;
    if (codigo_barras !== undefined) producto.codigo_barras = codigo_barras || null;
    if (stock_minimo !== undefined) {
      producto.stock_minimo = stock_minimo === null || stock_minimo === '' ? null : parseInt(stock_minimo, 10);
    }
    if (unidad_compra !== undefined) producto.unidad_compra = unidad_compra || 'Unidad';
    if (factor_conversion !== undefined) {
      producto.factor_conversion = factor_conversion === null || factor_conversion === '' ? 1 : parseInt(factor_conversion, 10);
    }
    if (maneja_vencimiento !== undefined) producto.maneja_vencimiento = !!maneja_vencimiento;

    await producto.save();

    const productoActualizado = await Producto.findByPk(producto.id, { include: INCLUDE });
    await adjuntarProximasFechas([productoActualizado]);
    return res.status(200).json(presentarProducto(productoActualizado));
  } catch (err) {
    console.error('Error en actualizar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Desactivar un producto (soft delete) ─────────────────────────────────────
const desactivar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await producto.update({ activo: false });
    return res.status(200).json({ mensaje: 'Producto desactivado' });
  } catch (err) {
    console.error('Error en desactivar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ─── Reactivar un producto ────────────────────────────────────────────────────
const reactivar = async (req, res) => {
  try {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    await producto.update({ activo: true });
    return res.status(200).json({ mensaje: 'Producto reactivado' });
  } catch (err) {
    console.error('Error en reactivar producto:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// Suma días a una fecha 'YYYY-MM-DD' sin pasar por conversión UTC (construye
// y lee la fecha siempre en hora local del proceso, nunca via toISOString):
// así el resultado no depende de en qué zona horaria corre el servidor.
const sumarDias = (fechaStr, dias) => {
  const [anio, mes, dia] = fechaStr.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  d.setDate(d.getDate() + dias);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// ─── Productos próximos a vencer ──────────────────────────────────────────────
const listarProximosVencer = async (req, res) => {
  try {
    const dias = parseInt(req.query.dias, 10) || 30;
    // Comparación fecha-contra-fecha (strings 'YYYY-MM-DD', hora Perú), no
    // fecha-contra-instante: usar `new Date()` del proceso aquí dependía de
    // la zona horaria del servidor, igual que el bug ya corregido en
    // inventario.controller.js → validarFechaVencimiento.
    const hoy = hoyPeru();
    const fechaLimite = sumarDias(hoy, dias);

    const entradas = await EntradaMercaderia.findAll({
      where: {
        fecha_vencimiento: { [Op.ne]: null },
        cantidad_restante: { [Op.gt]: 0 },
      },
      include: [
        { association: 'producto', attributes: ['id', 'nombre', 'marca'] },
      ],
    });

    const mapa = {};

    for (const e of entradas) {
      const fv = e.fecha_vencimiento; // DATEONLY: ya viene como 'YYYY-MM-DD'
      if (!mapa[e.producto_id]) {
        mapa[e.producto_id] = {
          id: e.producto.id,
          nombre: e.producto.nombre,
          marca: e.producto.marca,
          stock_vencido: 0,
          stock_por_vencer: 0,
          proxima_fecha: null,
        };
      }
      if (fv < hoy) {
        mapa[e.producto_id].stock_vencido += e.cantidad_restante;
      } else if (fv <= fechaLimite) {
        mapa[e.producto_id].stock_por_vencer += e.cantidad_restante;
        if (!mapa[e.producto_id].proxima_fecha || fv < mapa[e.producto_id].proxima_fecha) {
          mapa[e.producto_id].proxima_fecha = fv;
        }
      }
    }

    const resultado = Object.values(mapa);
    return res.status(200).json(resultado);
  } catch (err) {
    console.error('Error en listarProximosVencer:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { listar, listarActivos, buscarPorCodigo, buscarInfoExterna, obtener, crear, actualizar, desactivar, reactivar, listarProximosVencer };
