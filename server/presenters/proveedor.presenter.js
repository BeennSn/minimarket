const presentarProveedor = (proveedor) => ({
  id:       proveedor.id,
  nombre:   proveedor.nombre,
  ruc:      proveedor.ruc,
  contacto: proveedor.contacto,
  activo:   proveedor.activo,
});

const presentarLista = (proveedores) => proveedores.map(presentarProveedor);

module.exports = { presentarProveedor, presentarLista };
