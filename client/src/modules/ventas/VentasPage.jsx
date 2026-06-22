import { useState, useEffect, useMemo } from 'react';
import {
  Search, User, X, Trash2, Minus, Plus, Banknote,
  CheckCircle, Loader2, ShoppingCart, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../utils/axios';

const ITEMS_PER_PAGE = 25;

function ModalComprobante({ venta, onCerrar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-3 text-lg font-bold text-gray-800">¡Venta realizada!</h2>
          <p className="mt-1 text-sm text-gray-400">Venta #00{venta?.id}</p>
        </div>

        <div className="space-y-2">
          {(venta?.detalles || venta?.items || []).map((item, i) => (
            <div key={item.id ?? i} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {item.producto?.nombre || item.nombre} x{item.cantidad}
              </span>
              <span className="text-gray-800 font-medium">
                S/. {Number(item.subtotal || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <hr className="my-3 border-gray-100" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="text-lg font-bold text-gray-800">
            S/. {Number(venta?.monto_total || venta?.total || 0).toFixed(2)}
          </span>
        </div>

        <p className="mt-2 text-sm text-gray-500">
          Método de pago: {venta?.metodo_pago}
        </p>

        {venta?.monto_recibido > 0 && (
          <p className="text-sm text-gray-500">
            Monto recibido: S/. {Number(venta?.monto_recibido).toFixed(2)}
            {' '}— Vuelto: S/. {Number(venta?.vuelto || 0).toFixed(2)}
          </p>
        )}

        {venta?.cliente?.nombre && (
          <p className="text-sm text-gray-500">Cliente: {venta.cliente.nombre}</p>
        )}

        <button
          onClick={onCerrar}
          className="mt-5 w-full rounded-lg bg-[#6366f1] py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          Nueva Venta
        </button>
      </div>
    </div>
  );
}

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [cliente, setCliente] = useState(null);
  const [dni, setDni] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalComprobante, setModalComprobante] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);

  useEffect(() => {
    api.get('/productos/activos').then(({ data }) => {
      setProductos(Array.isArray(data) ? data : []);
    }).catch((err) => {
      setError(err.response?.data?.mensaje || 'Error al cargar productos');
    });
  }, []);

  const categorias = useMemo(() => {
    const cats = new Map();
    productos.forEach((p) => {
      if (p.categoria) cats.set(p.categoria.id, p.categoria.nombre);
    });
    return Array.from(cats, ([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    let filtrados = productos;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q)
      );
    }
    if (categoriaFiltro) {
      filtrados = filtrados.filter(
        (p) => p.categoria?.id === Number(categoriaFiltro)
      );
    }
    return filtrados;
  }, [productos, busqueda, categoriaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * ITEMS_PER_PAGE;
  const productosPagina = productosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);

  const buscarCliente = async () => {
    if (!dni.trim()) return;
    try {
      const { data } = await api.post('/clientes/buscar-o-crear', { dni: dni.trim() });
      setCliente(data);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al buscar cliente');
    }
  };

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, producto.stock) }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, nuevaCantidad) => {
    const prod = productos.find((p) => p.id === id);
    const max = prod?.stock ?? 99;
    const cantidad = Math.max(1, Math.min(nuevaCantidad, max));
    setCarrito((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const vuelto = montoRecibido ? parseFloat(montoRecibido) - total : 0;
  const puedeVender =
    carrito.length > 0 &&
    (metodoPago !== 'Efectivo' || (montoRecibido && parseFloat(montoRecibido) >= total));

  const resetear = () => {
    setCarrito([]);
    setCliente(null);
    setMontoRecibido('');
    setVentaExitosa(null);
    setBusqueda('');
    setCategoriaFiltro('');
    setPaginaActual(1);
    setError('');
  };

  const realizarVenta = async () => {
    setError('');
    setLoading(true);

    try {
      const body = {
        cliente_id: cliente?.id || null,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'Efectivo' ? parseFloat(montoRecibido) : 0,
        items: carrito.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        })),
      };

      const { data } = await api.post('/ventas', body);
      setVentaExitosa(data);
      setModalComprobante(true);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al realizar venta');
    } finally {
      setLoading(false);
    }
  };

  const cerrarComprobante = () => {
    setModalComprobante(false);
    resetear();
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              placeholder="DNI del cliente (opcional)"
              maxLength={8}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={buscarCliente}
            className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
          >
            Buscar
          </button>
          {cliente && (
            <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
              {cliente.nombre}
              <button onClick={() => setCliente(null)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Precio Unit.</th>
                <th className="px-4 py-3 font-medium">Cantidad</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carrito.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    Agrega productos desde la lista de abajo
                  </td>
                </tr>
              ) : (
                carrito.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{item.nombre}</span>
                      <span className="ml-1 text-gray-400">{item.marca}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      S/. {Number(item.precio).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={item.cantidad}
                          min={1}
                          max={item.stock}
                          onChange={(e) =>
                            cambiarCantidad(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-12 rounded border border-gray-200 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      S/. {(item.precio * item.cantidad).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {carrito.length > 0 && (
          <div className="text-right text-xl font-bold text-gray-800">
            Total: S/. {total.toFixed(2)}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
              placeholder="Buscar producto por nombre o marca..."
              className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select
            value={categoriaFiltro}
            onChange={(e) => { setCategoriaFiltro(e.target.value); setPaginaActual(1); }}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todas las categorías</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nombre}</option>
            ))}
          </select>
          <span className="text-sm text-gray-400">
            {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {productosPagina.length === 0 ? (
            <div className="col-span-5 py-10 text-center text-sm text-gray-400">
              No se encontraron productos
            </div>
          ) : (
            productosPagina.map((p) => {
              const sinStock = p.stock === 0;
              const enCarrito = carrito.some((item) => item.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={sinStock}
                  onClick={() => !sinStock && agregarAlCarrito(p)}
                  className={`relative flex flex-col items-start rounded-xl border p-3 text-left text-sm transition-all ${
                    sinStock
                      ? 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                      : enCarrito
                        ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                  }`}
                >
                  <span className="font-medium text-gray-800 leading-tight">{p.nombre}</span>
                  <span className="mt-0.5 text-gray-400 text-xs">{p.marca}</span>
                  <div className="mt-2 flex w-full items-center justify-between">
                    <span className="font-semibold text-indigo-600">
                      S/. {Number(p.precio).toFixed(2)}
                    </span>
                    {sinStock ? (
                      <span className="text-xs text-red-400 font-medium">Sin stock</span>
                    ) : (
                      <span className="text-xs text-gray-400">{p.stock} ud.</span>
                    )}
                  </div>
                  {enCarrito && (
                    <span className="absolute right-2 top-2 rounded-full bg-indigo-500 px-1.5 py-0.5 text-xs text-white">
                      {carrito.find((item) => item.id === p.id)?.cantidad}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaSegura <= 1}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pag) => (
              <button
                key={pag}
                onClick={() => setPaginaActual(pag)}
                className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                  pag === paginaSegura
                    ? 'bg-[#6366f1] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {pag}
              </button>
            ))}
            <button
              onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura >= totalPaginas}
              className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="w-80">
        <div className="sticky top-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-700">Resumen de Venta</h3>
          <hr className="border-gray-100" />

          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-800">S/. {total.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-bold text-gray-800">
              <span>Total</span>
              <span>S/. {total.toFixed(2)}</span>
            </div>
          </div>

          <hr className="my-3 border-gray-100" />

          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Yape">Yape</option>
            <option value="Plin">Plin</option>
          </select>

          {metodoPago === 'Efectivo' && (
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="number"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder="Monto recibido"
                  min={0}
                  step="0.01"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Vuelto</span>
                <span
                  className={`font-medium ${
                    vuelto >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  S/. {vuelto.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={realizarVenta}
            disabled={!puedeVender || loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] py-3 font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Realizar Venta'
            )}
          </button>

          <button
            onClick={resetear}
            className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            Vaciar carrito
          </button>
        </div>
      </div>

      {modalComprobante && ventaExitosa && (
        <ModalComprobante venta={ventaExitosa} onCerrar={cerrarComprobante} />
      )}
    </div>
  );
}
