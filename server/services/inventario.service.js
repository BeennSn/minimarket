const { Op } = require('sequelize');
const { EntradaMercaderia, ConsumoLote, Producto } = require('../models');
const { hoyPeru } = require('../utils/fechas');

// ─── Crear lote (entrada de mercadería) ───────────────────────────────────────
const crearLote = async ({ producto_id, proveedor_id, cantidad, fecha_vencimiento, usuario_id, solicitud_id, costo_unitario, ajuste_id, cantidad_unidad_compra, unidad_compra_snapshot, codigo_lote }, t) => {
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
    cantidad_unidad_compra: cantidad_unidad_compra ?? null,
    unidad_compra_snapshot: unidad_compra_snapshot ?? null,
    codigo_lote: codigo_lote?.trim() || null,
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
};

// ─── Consumir stock de lotes en orden FEFO (primero vence, primero sale) ─────
// soloVigente=true excluye lotes ya vencidos de la selección (usado por
// ventas: es ilegal vender producto vencido). Se deja en false por defecto
// porque Bajas y Ajustes sí necesitan poder consumir lotes vencidos —de
// hecho, dar de baja stock vencido es precisamente para eso.
// entrada_id: si se especifica, restringe el consumo a ESE lote puntual en
// vez de dejar que el sistema elija automáticamente por FEFO (usado por
// Bajas cuando el usuario quiere dar de baja un lote específico, ej. uno
// dañado que no es necesariamente el que vence primero).
const consumirStockFIFO = async ({ producto_id, cantidad, tipo, referencia = {}, soloVigente = false, entrada_id = null }, t) => {
  const where = { producto_id, cantidad_restante: { [Op.gt]: 0 } };
  if (entrada_id) {
    where.id = entrada_id;
  }
  if (soloVigente) {
    // Estrictamente después de hoy (en hora de Perú): un lote que vence hoy
    // mismo ya NO se considera vigente (decisión de negocio: no se vende lo
    // que vence hoy). Comparación fecha-contra-fecha (string), no
    // fecha-contra-instante, para no arrastrar el desfase de zona horaria.
    where[Op.or] = [
      { fecha_vencimiento: null },
      { fecha_vencimiento: { [Op.gt]: hoyPeru() } },
    ];
  }

  const lotes = await EntradaMercaderia.findAll({
    where,
    // 'id' ASC como desempate final: sin esto, dos lotes con igual
    // fecha_vencimiento (o ambos null) Y el mismo createdAt (colisión de
    // milisegundo, posible en importaciones masivas) no tendrían un orden
    // garantizado por SQL.
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
    });
    restante -= tomar;
  }

  if (restante > 0) {
    const mensaje = entrada_id
      ? 'El lote seleccionado no tiene suficiente stock restante para esta cantidad'
      : soloVigente
      ? 'Stock insuficiente: parte o todo el stock de este producto está vencido. Da de baja el lote vencido antes de venderlo.'
      : 'Stock insuficiente en los lotes registrados (descuadre de inventario, contactar al administrador)';
    throw { status: 400, mensaje };
  }

  await ConsumoLote.bulkCreate(consumosData, { transaction: t });

  const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
  producto.stock -= cantidad;
  await producto.save({ transaction: t });

  return consumosData;
};

// ─── Revertir un consumo (anulación de venta o baja) ──────────────────────────
const revertirConsumo = async ({ tipo, referencia_id }, t) => {
  const where = tipo === 'Venta'
    ? { tipo: 'Venta', detalle_venta_id: referencia_id }
    : { tipo: 'Baja', baja_id: referencia_id };

  const consumos = await ConsumoLote.findAll({ where, transaction: t });
  if (!consumos.length) return;

  let totalDevuelto = 0;
  let producto_id = null;

  for (const consumo of consumos) {
    const lote = await EntradaMercaderia.findByPk(consumo.entrada_id, { transaction: t, lock: t.LOCK.UPDATE });
    if (lote) {
      lote.cantidad_restante += consumo.cantidad;
      await lote.save({ transaction: t });
      producto_id = lote.producto_id;
    }
    totalDevuelto += consumo.cantidad;
    await consumo.destroy({ transaction: t });
  }

  if (producto_id) {
    const producto = await Producto.findByPk(producto_id, { transaction: t, lock: t.LOCK.UPDATE });
    producto.stock += totalDevuelto;
    await producto.save({ transaction: t });
  }
};

// ─── Stock realmente vigente (no vencido) de un producto ──────────────────────
// Suma cantidad_restante solo de lotes sin vencer (o sin fecha) — un lote que
// vence HOY mismo ya no cuenta como vigente —, para poder avisar de una vez
// si el stock disponible está vencido, sin esperar a la transacción de la venta.
const calcularStockVigente = async (producto_id) => {
  const lotes = await EntradaMercaderia.findAll({
    where: {
      producto_id,
      cantidad_restante: { [Op.gt]: 0 },
      [Op.or]: [
        { fecha_vencimiento: null },
        { fecha_vencimiento: { [Op.gt]: hoyPeru() } },
      ],
    },
    attributes: ['cantidad_restante'],
  });
  return lotes.reduce((suma, l) => suma + l.cantidad_restante, 0);
};

module.exports = { crearLote, consumirStockFIFO, revertirConsumo, calcularStockVigente };
