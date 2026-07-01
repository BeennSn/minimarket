const presentarResumenVentas = (data) => ({
  total_ventas:  parseInt(data.total_ventas) || 0,
  monto_total:   parseFloat(data.monto_total) || 0,
  promedio_venta: parseFloat(data.promedio_venta) || 0,
});

const presentarProductoTop = (data) => {
  const item = data.dataValues || data;
  const prod = item.producto || {};
  return {
    producto_id:   item.producto_id,
    nombre:        prod.nombre || '',
    marca:         prod.marca || '',
    total_vendido: parseInt(item.total_vendido) || 0,
    ingreso_total: parseFloat(item.ingreso_total) || 0,
  };
};

const presentarVentasPorDia = (data) => ({
  fecha:         data.fecha,
  total_ventas:  parseInt(data.total_ventas) || 0,
  monto_total:   parseFloat(data.monto_total) || 0,
});

const presentarMetodoPago = (data) => ({
  metodo_pago:   data.metodo_pago,
  total_ventas:  parseInt(data.total_ventas) || 0,
  monto_total:   parseFloat(data.monto_total) || 0,
});

const presentarMargenProducto = (row) => {
  const ingreso = parseFloat(row.ingreso_total) || 0;
  const costo   = parseFloat(row.costo_total)   || 0;
  const margen  = ingreso - costo;
  return {
    producto_id:   row.id,
    nombre:        row.nombre,
    marca:         row.marca,
    categoria:     row.categoria || null,
    total_vendido: parseInt(row.total_vendido) || 0,
    ingreso_total: ingreso,
    costo_total:   costo,
    margen,
    margen_pct:    costo > 0 ? parseFloat(((margen / costo) * 100).toFixed(2)) : null,
  };
};

const presentarMerma = (row) => ({
  motivo:           row.motivo,
  num_bajas:        parseInt(row.num_bajas) || 0,
  cantidad_total:   parseInt(row.cantidad_total) || 0,
  costo_valorizado: parseFloat(row.costo_valorizado) || 0,
});

module.exports = { presentarResumenVentas, presentarProductoTop, presentarVentasPorDia, presentarMetodoPago, presentarMargenProducto, presentarMerma };
