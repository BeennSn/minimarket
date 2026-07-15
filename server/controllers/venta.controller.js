const { Op } = require('sequelize');
const { sequelize, Venta, DetalleVenta, Producto, Usuario, Cliente, Turno, MovimientoCaja, Configuracion } = require('../models');
const { presentarVenta, presentarLista } = require('../presenters/venta.presenter');
const { consumirStockFIFO, revertirConsumo, calcularStockVigente } = require('../services/inventario.service');
const { calcularEsperados } = require('../services/caja.service');
const { consultarRucSunat } = require('../services/consulta.service');
const { inicioDiaPeru, finDiaPeruExclusivo } = require('../utils/fechas');

// Efectivo realmente disponible en el turno para dar vuelto: apertura +
// movimientos en efectivo (ventas, ingresos manuales) - egresos/anulaciones.
// Sin este chequeo, el sistema aceptaba una venta en efectivo aunque la caja
// físicamente no tuviera cómo dar el cambio (ej. abren con S/20 y alguien
// paga con un billete de S/100 la primera venta del día).
const efectivoDisponibleEnTurno = async (turnoId, transaction) => {
  const movimientos = await MovimientoCaja.findAll({ where: { turno_id: turnoId }, transaction });
  return calcularEsperados(movimientos).monto_esperado_efectivo;
};

const INCLUDE_VENTA = [
  { association: 'usuario', attributes: ['id', 'nombre'] },
  { association: 'cliente', attributes: ['id', 'nombre', 'dni'] },
  { association: 'anulador', attributes: ['id', 'nombre'] },
  {
    association: 'detalles',
    include: [{ association: 'producto', attributes: ['id', 'nombre', 'marca', 'codigo_barras'] }],
  },
];

// Único mensaje para "no hay turno utilizable": la consulta que lo produce
// siempre está acotada a { usuario_id: req.usuario.id, estado: 'Abierto' },
// así que un turno inexistente, uno cerrado o uno de otro vendedor son, desde
// la perspectiva de este endpoint, exactamente el mismo caso — nunca se
// aceptó ni se acepta un turno_id enviado por el cliente, por lo que no hay
// forma de que una venta quede asociada al turno de otro usuario.
const MSG_SIN_TURNO = 'No puedes realizar ventas porque no tienes un turno de caja abierto. Abre un turno para continuar.';

const registrar = async (req, res) => {
  try {
    const { cliente_id, metodo_pago, monto_recibido, items, tipo_comprobante, cliente_dni, cliente_ruc, cliente_razon_social, cliente_direccion, yape_verificado, referencia_pago } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ mensaje: 'La venta debe tener al menos un producto' });
    }

    if (!['Efectivo', 'Yape'].includes(metodo_pago)) {
      return res.status(400).json({ mensaje: 'El método de pago debe ser Efectivo o Yape' });
    }

    // El frontend ya bloquea el botón "Pago confirmado" sin este dato, pero
    // eso es solo UI — se revalida acá porque es el único campo que permite
    // ubicar el pago en IziPay/Yape si hay que conciliarlo o reclamarlo.
    if (metodo_pago === 'Yape' && !/^\d{6}$/.test(referencia_pago || '')) {
      return res.status(400).json({ mensaje: 'El N° de autorización es obligatorio y debe tener 6 dígitos numéricos' });
    }

    // ─── Turno de caja obligatorio ─────────────────────────────────────────
    // Validación de negocio (no solo de UI): sin un turno abierto del propio
    // vendedor autenticado, la venta ni siquiera llega a tocar stock/BD.
    const turnoActivo = await Turno.findOne({
      where: { usuario_id: req.usuario.id, estado: 'Abierto' },
    });
    if (!turnoActivo) {
      return res.status(400).json({ mensaje: MSG_SIN_TURNO });
    }

    for (const item of items) {
      if (!item.producto_id || item.producto_id <= 0) {
        return res.status(400).json({ mensaje: 'Cada item debe tener un producto válido' });
      }
      if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1) {
        return res.status(400).json({ mensaje: 'La cantidad de cada item debe ser un número entero mayor a 0' });
      }
    }

    if (tipo_comprobante === 'Factura') {
      if (!/^\d{11}$/.test(cliente_ruc)) {
        return res.status(400).json({ mensaje: 'Para emitir factura se requiere un RUC válido de 11 dígitos' });
      }
      // El frontend ya verifica esto contra SUNAT antes de habilitar la
      // venta (VentasPage.jsx:buscarRuc), pero eso solo es UI — nada impide
      // llamar este endpoint directo con cualquier RUC de 11 dígitos y una
      // razón social inventada. Se revalida acá con el mismo criterio.
      let datosRuc;
      try {
        datosRuc = await consultarRucSunat(cliente_ruc);
      } catch (err) {
        return res.status(err.status || 502).json({ mensaje: err.mensaje || 'No se pudo verificar el RUC con SUNAT' });
      }
      if (datosRuc.estado && datosRuc.estado.toUpperCase() !== 'ACTIVO') {
        return res.status(400).json({ mensaje: `RUC dado de baja en SUNAT (estado: ${datosRuc.estado})` });
      }
      if (datosRuc.condicion && datosRuc.condicion.toUpperCase() !== 'HABIDO') {
        return res.status(400).json({ mensaje: `RUC con domicilio no habido en SUNAT (condición: ${datosRuc.condicion})` });
      }
    }

    if (cliente_dni) {
      if (!/^\d{8}$/.test(cliente_dni)) {
        return res.status(400).json({ mensaje: 'Para boleta con DNI se requiere un DNI válido de 8 dígitos' });
      }
      const clienteVerificado = cliente_id && await Cliente.findOne({ where: { id: cliente_id, dni: cliente_dni } });
      if (!clienteVerificado) {
        return res.status(400).json({ mensaje: 'El DNI debe verificarse (consulta RENIEC) antes de registrar la venta' });
      }
    }

    // ─── Validaciones previas (fuera de transacción) ──────────────────────────
    let monto_total_prev = 0;
    for (const item of items) {
      const producto = await Producto.findByPk(item.producto_id);
      if (!producto || !producto.activo) {
        return res.status(400).json({ mensaje: 'Producto no encontrado o inactivo' });
      }

      const cantidadBase = Number(item.cantidad);

      if (producto.stock < cantidadBase) {
        return res.status(400).json({ mensaje: `Stock insuficiente para: ${producto.nombre}` });
      }
      // Es ilegal vender producto vencido: el stock "vigente" excluye lotes
      // ya vencidos, aunque el stock total del producto los siga contando.
      const stockVigente = await calcularStockVigente(item.producto_id);
      if (stockVigente < cantidadBase) {
        return res.status(400).json({ mensaje: `"${producto.nombre}" tiene stock vencido: solo hay ${stockVigente} unidad(es) vigente(s) disponible(s). Da de baja el lote vencido para continuar.` });
      }
      monto_total_prev += parseFloat(item.cantidad * producto.precio);
    }

    if (metodo_pago === 'Efectivo') {
      const montoRecibidoNum = parseFloat(monto_recibido);
      if (!Number.isFinite(montoRecibidoNum) || montoRecibidoNum < 0 || montoRecibidoNum > 999999.99) {
        return res.status(400).json({ mensaje: 'Monto recibido inválido' });
      }
      if (montoRecibidoNum < monto_total_prev) {
        return res.status(400).json({ mensaje: 'Monto recibido insuficiente' });
      }

      const vueltoPrev = montoRecibidoNum - monto_total_prev;
      if (vueltoPrev > 0) {
        const disponiblePrev = await efectivoDisponibleEnTurno(turnoActivo.id);
        if (disponiblePrev < vueltoPrev) {
          return res.status(400).json({
            mensaje: `Monto en caja insuficiente para dar el vuelto. Efectivo disponible: S/ ${disponiblePrev.toFixed(2)}, vuelto necesario: S/ ${vueltoPrev.toFixed(2)}. Registra un ingreso en Caja antes de continuar.`,
          });
        }
      }
    }

    const venta = await sequelize.transaction(async (t) => {
      // Re-verifica el turno con bloqueo de fila dentro de la transacción:
      // cubre la ventana entre la validación previa (arriba) y este punto,
      // por si el mismo vendedor cerró su turno desde otra pestaña/petición
      // justo en el medio (evita una venta "huérfana" sin turno real).
      const turno = await Turno.findOne({
        where: { id: turnoActivo.id, usuario_id: req.usuario.id, estado: 'Abierto' },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!turno) {
        throw { status: 400, mensaje: MSG_SIN_TURNO };
      }

      let monto_total = 0;
      const detallesData = [];

      const itemsOrdenados = [...items].sort((a, b) => a.producto_id - b.producto_id);
      for (const item of itemsOrdenados) {
        const producto = await Producto.findByPk(item.producto_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!producto || !producto.activo) throw { status: 400, mensaje: 'Producto no encontrado o inactivo' };

        const cantidadBase = Number(item.cantidad);

        if (producto.stock < cantidadBase) throw { status: 400, mensaje: `Stock insuficiente para: ${producto.nombre}` };
        const subtotal = parseFloat(item.cantidad * producto.precio);
        monto_total += subtotal;

        detallesData.push({
          producto_id:      item.producto_id,
          cantidad:         cantidadBase,
          precio_unitario:  producto.precio,
          subtotal,
        });
      }

      if (metodo_pago === 'Efectivo' && parseFloat(monto_recibido) < monto_total) {
        throw { status: 400, mensaje: 'Monto recibido insuficiente' };
      }

      const vuelto = metodo_pago === 'Efectivo'
        ? parseFloat(monto_recibido) - monto_total
        : null;

      // Reverifica el efectivo disponible ya con el turno bloqueado (cubre la
      // ventana entre el pre-chequeo de arriba y este punto, por si otra
      // venta en efectivo del mismo turno se coló en el medio).
      if (metodo_pago === 'Efectivo' && vuelto > 0) {
        const disponible = await efectivoDisponibleEnTurno(turno.id, t);
        if (disponible < vuelto) {
          throw {
            status: 400,
            mensaje: `Monto en caja insuficiente para dar el vuelto. Efectivo disponible: S/ ${disponible.toFixed(2)}, vuelto necesario: S/ ${vuelto.toFixed(2)}. Registra un ingreso en Caja antes de continuar.`,
          };
        }
      }

      const esYapeVerificado = metodo_pago === 'Yape' && yape_verificado === true;

      // Correlativo real por serie: cada tipo de comprobante lleva su propio
      // contador atómico en Configuracion, incrementado bajo lock dentro de
      // esta misma transacción — así dos ventas simultáneas nunca terminan
      // con el mismo número, y boletas/facturas intercaladas no dejan huecos
      // en la numeración de la otra serie (antes se usaba el id autoincremental
      // de Venta, compartido entre ambas).
      const tipoComprobanteFinal = tipo_comprobante || 'Boleta';
      let config = await Configuracion.findByPk(1, { transaction: t, lock: t.LOCK.UPDATE });
      if (!config) {
        config = await Configuracion.create({ id: 1 }, { transaction: t });
      }
      const campoCorrelativo = tipoComprobanteFinal === 'Factura' ? 'correlativo_factura' : 'correlativo_boleta';
      config[campoCorrelativo] = (config[campoCorrelativo] || 0) + 1;
      await config.save({ transaction: t });

      const nuevaVenta = await Venta.create({
        usuario_id:    req.usuario.id,
        cliente_id:    cliente_id || null,
        turno_id:      turno.id,
        metodo_pago,
        monto_total:   monto_total.toFixed(2),
        monto_recibido: metodo_pago === 'Efectivo' ? parseFloat(monto_recibido).toFixed(2) : null,
        monto_yape:    metodo_pago === 'Yape' ? monto_total.toFixed(2) : null,
        vuelto:        metodo_pago === 'Efectivo' ? vuelto.toFixed(2) : null,
        tipo_comprobante: tipoComprobanteFinal,
        numero_comprobante: config[campoCorrelativo],
        serie_comprobante: tipoComprobanteFinal === 'Factura' ? config.serie_factura : config.serie_boleta,
        cliente_dni:   cliente_dni || null,
        cliente_ruc:   cliente_ruc || null,
        cliente_razon_social: cliente_razon_social || null,
        cliente_direccion: cliente_direccion || null,
        yape_verificado: esYapeVerificado,
        yape_verificado_por: esYapeVerificado ? req.usuario.id : null,
        yape_verificado_en: esYapeVerificado ? new Date() : null,
        referencia_pago: metodo_pago === 'Yape' ? (referencia_pago || null) : null,
      }, { transaction: t });

      const detalles = await DetalleVenta.bulkCreate(
        detallesData.map((d) => ({ ...d, venta_id: nuevaVenta.id })),
        { transaction: t, returning: true }
      );

      // Descontar stock de los lotes en orden FEFO (primero vence, primero sale).
      // soloVigente: true — nunca se vende de un lote ya vencido, aunque el
      // pre-chequeo de arriba ya lo haya validado (cubre la ventana de carrera).
      for (const detalle of detalles) {
        await consumirStockFIFO({
          producto_id: detalle.producto_id,
          cantidad:    detalle.cantidad,
          tipo:        'Venta',
          referencia:  { detalle_venta_id: detalle.id },
          soloVigente: true,
        }, t);
      }

      // El turno ya fue validado y bloqueado arriba, así que el movimiento de
      // caja de esta venta siempre queda registrado (antes era condicional).
      await MovimientoCaja.create({
        turno_id:    turno.id,
        tipo:        'Venta',
        descripcion: `Venta #${nuevaVenta.id}`,
        metodo:      metodo_pago === 'Efectivo' ? 'Efectivo' : 'Yape',
        monto:       monto_total.toFixed(2),
        venta_id:    nuevaVenta.id,
        usuario_id:  req.usuario.id,
      }, { transaction: t });

      return { venta: nuevaVenta, detalles };
    });

    const ventaCompleta = await Venta.findByPk(venta.venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(201).json(presentarVenta(ventaCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error en registrar venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listar = async (req, res) => {
  try {
    const { fecha_inicio, fecha_hasta, metodo_pago, estado, pagina, limite } = req.query;
    const where = {};

    if (fecha_inicio && fecha_hasta && new Date(fecha_inicio) > new Date(fecha_hasta)) {
      return res.status(400).json({ mensaje: 'La fecha de inicio no puede ser posterior a la fecha final' });
    }

    if (fecha_inicio && fecha_hasta) {
      where.createdAt = { [Op.between]: [inicioDiaPeru(fecha_inicio), finDiaPeruExclusivo(fecha_hasta)] };
    } else if (fecha_inicio) {
      where.createdAt = { [Op.gte]: inicioDiaPeru(fecha_inicio) };
    } else if (fecha_hasta) {
      where.createdAt = { [Op.lt]: finDiaPeruExclusivo(fecha_hasta) };
    }

    if (metodo_pago) {
      where.metodo_pago = metodo_pago;
    }

    if (estado) {
      where.estado = estado;
    }

    // Un Vendedor solo ve sus propias ventas; Administrador/Gerente ven todas.
    if (req.usuario.rol === 'Vendedor') {
      where.usuario_id = req.usuario.id;
    }

    const page = Math.max(1, parseInt(pagina) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limite) || 25));
    const offset = (page - 1) * limit;

    const { count, rows } = await Venta.findAndCountAll({
      where,
      include: INCLUDE_VENTA,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    return res.status(200).json({
      data: presentarLista(rows),
      pagination: {
        total: count,
        pagina: page,
        limite: limit,
        totalPaginas: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('Error en listar ventas:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const obtener = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: INCLUDE_VENTA,
    });

    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }

    if (req.usuario.rol === 'Vendedor' && venta.usuario_id !== req.usuario.id) {
      return res.status(403).json({ mensaje: 'No tienes acceso a esta venta' });
    }

    return res.status(200).json(presentarVenta(venta));
  } catch (err) {
    console.error('Error en obtener venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const verificarYape = async (req, res) => {
  try {
    const venta = await Venta.findByPk(req.params.id);

    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }

    if (venta.metodo_pago !== 'Yape') {
      return res.status(400).json({ mensaje: 'La venta no es de tipo Yape' });
    }

    if (venta.yape_verificado) {
      return res.status(400).json({ mensaje: 'El Yape ya fue verificado anteriormente' });
    }

    venta.yape_verificado = true;
    venta.yape_verificado_por = req.usuario.id;
    venta.yape_verificado_en = new Date();
    await venta.save();

    const ventaCompleta = await Venta.findByPk(venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(200).json(presentarVenta(ventaCompleta));
  } catch (err) {
    console.error('Error en verificarYape:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const anular = async (req, res) => {
  try {
    const { motivo } = req.body;

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ mensaje: 'El motivo de anulación es obligatorio' });
    }

    const venta = await Venta.findByPk(req.params.id, {
      include: [{ association: 'detalles' }],
    });
    if (!venta) {
      return res.status(404).json({ mensaje: 'Venta no encontrada' });
    }
    if (venta.estado === 'Anulada') {
      return res.status(400).json({ mensaje: 'La venta ya fue anulada' });
    }

    const movimientoVenta = await MovimientoCaja.findOne({ where: { venta_id: venta.id, tipo: 'Venta' } });
    if (!movimientoVenta) {
      return res.status(400).json({ mensaje: 'No se puede anular: la venta no tiene un turno de caja asociado' });
    }

    const turno = await Turno.findByPk(movimientoVenta.turno_id);
    if (!turno || turno.estado !== 'Abierto') {
      return res.status(400).json({ mensaje: 'Solo se pueden anular ventas del turno de caja actualmente abierto' });
    }

    await sequelize.transaction(async (t) => {
      // Relee y bloquea la venta dentro de la transacción: cubre la ventana
      // entre el chequeo de arriba y este punto, por si otra anulación de la
      // misma venta se coló en el medio (evita revertir el stock y crear el
      // movimiento de caja de "Anulacion" dos veces). Mismo patrón que ya usa
      // registrar() con el turno.
      const ventaLock = await Venta.findByPk(venta.id, { transaction: t, lock: t.LOCK.UPDATE });
      if (ventaLock.estado === 'Anulada') {
        throw { status: 400, mensaje: 'La venta ya fue anulada' };
      }

      for (const detalle of venta.detalles) {
        await revertirConsumo({ tipo: 'Venta', referencia_id: detalle.id }, t);
      }

      ventaLock.estado = 'Anulada';
      ventaLock.motivo_anulacion = motivo.trim();
      ventaLock.anulado_por = req.usuario.id;
      ventaLock.anulado_en = new Date();
      await ventaLock.save({ transaction: t });

      await MovimientoCaja.create({
        turno_id:    turno.id,
        tipo:        'Anulacion',
        descripcion: `Anulación venta #${venta.id}: ${motivo.trim()}`,
        metodo:      movimientoVenta.metodo,
        monto:       movimientoVenta.monto,
        venta_id:    venta.id,
        usuario_id:  req.usuario.id,
      }, { transaction: t });
    });

    const ventaCompleta = await Venta.findByPk(venta.id, {
      include: INCLUDE_VENTA,
    });

    return res.status(200).json(presentarVenta(ventaCompleta));
  } catch (err) {
    if (err.status && err.mensaje) {
      return res.status(err.status).json({ mensaje: err.mensaje });
    }
    console.error('Error al anular venta:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { registrar, listar, obtener, verificarYape, anular };
