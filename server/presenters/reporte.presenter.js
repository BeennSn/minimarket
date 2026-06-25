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

module.exports = { presentarResumenVentas, presentarProductoTop, presentarVentasPorDia, presentarMetodoPago };
