const presentarResumenVentas = (data) => ({
  total_ventas:  parseInt(data.total_ventas) || 0,
  monto_total:   parseFloat(data.monto_total) || 0,
  promedio_venta: parseFloat(data.promedio_venta) || 0,
});

const presentarProductoTop = (data) => ({
  producto_id:   data.producto_id,
  nombre:        data['producto.nombre'] || data.producto?.nombre || '',
  marca:         data['producto.marca'] || data.producto?.marca || '',
  total_vendido: parseInt(data.total_vendido) || 0,
  ingreso_total: parseFloat(data.ingreso_total) || 0,
});

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

module.exports = { presentarResumenVentas, presentarProductoTop, presentarVentasPorDia, presentarMetodoPago };
