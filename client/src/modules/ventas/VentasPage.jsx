import { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import html2pdf from 'html2pdf.js';
import autoTable from 'jspdf-autotable';
import {
  Search, User, X, Trash2, Minus, Plus, Banknote,
  CheckCircle, Loader2, ShoppingCart, ChevronLeft, ChevronRight,
  ScanLine, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';

const ITEMS_PER_PAGE = 25;
const IGV = 0.18;
const EMPRESA = {
  nombre: 'MiniMarket',
  ruc: '20100123456',
  direccion: 'Av. España 250, Trujillo',
  telefono: '044-123456',
};

function numeroALetras(num) {
  const u = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const d = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const ve = ['', 'VEINTIUN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const c = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function convertir(n) {
    if (n === 0) return '';
    if (n < 20) return u[n];
    if (n < 30) return ve[n - 20];
    if (n < 100) {
      const dec = d[Math.floor(n / 10)];
      const uni = n % 10;
      return uni > 0 ? dec + ' Y ' + u[uni] : dec;
    }
    if (n < 1000) return (n === 100 ? 'CIEN' : c[Math.floor(n / 100)] + (n % 100 > 0 ? ' ' + convertir(n % 100) : ''));
    if (n < 1000000) return (Math.floor(n / 1000) === 1 ? 'MIL' : convertir(Math.floor(n / 1000)) + ' MIL') + (n % 1000 > 0 ? ' ' + convertir(n % 1000) : '');
    return (Math.floor(n / 1000000) === 1 ? 'UN MILLÓN' : convertir(Math.floor(n / 1000000)) + ' MILLONES') + (n % 1000000 > 0 ? ' ' + convertir(n % 1000000) : '');
  }
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  const letras = entero === 0 ? 'CERO' : convertir(entero);
  return `SON: ${letras} CON ${String(decimal).padStart(2, '0')}/100 SOLES`;
}

function generarPDF(venta) {
  const fecha = new Date(venta.createdAt);
  const numero = `B173-${String(venta.id).padStart(8, '0')}`;

  const productosHTML = (venta.detalles || venta.items || []).map(d => {
    const nombre = d.producto?.nombre || d.nombre || '';
    const cant = d.cantidad > 1 ? `${d.cantidad} ` : '';
    const desc = `${cant}${nombre}`;
    const precio = Number(d.subtotal || 0).toFixed(2);
    return `
      <tr>
        <td class="col-product">${desc}</td>
        <td class="col-price">${precio}</td>
      </tr>
    `;
  }).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div style="width: 80mm; padding: 8mm 5mm; box-sizing: border-box; font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; line-height: 1.4; color: #000; background-color: #fff;">
        <style>
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dotted #000; padding-bottom: 5px; margin-bottom: 5px; }
            .header-title { font-size: 14px; margin: 0 0 4px 0; }
            .slogan { font-size: 9px; margin: 0 0 5px 0; }
            .info-doc { margin: 5px 0; }
            .table-layout { width: 100%; border-collapse: collapse; }
            .table-layout th, .table-layout td { vertical-align: top; padding: 2px 0; }
            .table-layout th { font-weight: normal; }
            .table-layout th.bold { font-weight: bold; }
            .col-product { width: 75%; text-align: left; word-wrap: break-word; padding-right: 5px; }
            .col-price { width: 25%; text-align: right; white-space: nowrap; }
        </style>
        <div class="text-center header-title bold">${EMPRESA.nombre.toUpperCase()}</div>
        <div class="text-center slogan bold divider">PARTICIPA EN RÁPIDOS Y TAMBEROS</div>

        <div class="text-center info-doc divider">
            <div>BOLETA DE VENTA ELECTRÓNICA</div>
            <div>${numero}</div>
        </div>

        <table class="table-layout divider">
            <tr>
                <td class="text-left">Fecha: ${fecha.toLocaleDateString('es-PE')}</td>
                <td class="text-right">Hora: ${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
            </tr>
        </table>

        <table class="table-layout divider">
            <thead>
                <tr>
                    <th class="col-product text-left">PRODUCTOS</th>
                    <th class="col-price bold">PRECIO</th>
                </tr>
            </thead>
            <tbody>
                ${productosHTML}
            </tbody>
        </table>

        <table class="table-layout">
            <tr>
                <td class="text-left">TOTAL:</td>
                <td class="text-right bold">S/ ${Number(venta.monto_total || venta.total || 0).toFixed(2)}</td>
            </tr>
        </table>
    </div>
  `;

  // Calcular un alto aproximado basado en los items, pero podemos dejar un largo estándar de 297 (A4)
  // o ajustar a algo mas dinamico si usaramos canvas.
  const opt = {
    margin: 0,
    filename: `boleta_${numero}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: [80, 297], orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container.firstElementChild).save();
}

function ModalComprobante({ venta, onCerrar, onDescargarPDF }) {
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

        <div className="mt-2 flex items-center justify-center gap-2">
          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">Boleta</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            venta.metodo_pago === 'Yape'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {venta.metodo_pago}
          </span>
        </div>

        {venta?.monto_recibido > 0 && (
          <p className="text-sm text-gray-500 text-center">
            Monto recibido: S/. {Number(venta?.monto_recibido).toFixed(2)}
            {' '}— Vuelto: S/. {Number(venta?.vuelto || 0).toFixed(2)}
          </p>
        )}

        {venta?.yape_verificado && (
          <p className="text-center text-xs text-emerald-600">
            <CheckCircle className="mr-1 inline h-3 w-3" />
            Yape verificado — S/. {Number(venta?.monto_total || 0).toFixed(2)}
          </p>
        )}

        <button
          onClick={onDescargarPDF}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <FileText className="h-4 w-4" />
          Descargar Boleta PDF
        </button>

        <button
          onClick={onCerrar}
          className="mt-2 w-full rounded-lg bg-[#6366f1] py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          Nueva Venta
        </button>
      </div>
    </div>
  );
}

export default function VentasPage() {
  const { usuario } = useAuth();
  const esSoloLectura = usuario?.rol === 'Gerente';
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [yapeVerificado, setYapeVerificado] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalComprobante, setModalComprobante] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const inputCodigoRef = useRef(null);

  const cargarProductos = () => {
    api.get('/productos/activos').then(({ data }) => {
      setProductos(Array.isArray(data) ? data : []);
    }).catch((err) => {
      setError(err.response?.data?.mensaje || 'Error al cargar productos');
    });
  };

  useEffect(() => { cargarProductos(); }, []);

  const buscarPorCodigo = async () => {
    const codigo = codigoBarras.trim();
    if (!codigo) return;
    setBuscandoCodigo(true);
    setError('');
    try {
      const { data } = await api.get(`/productos/codigo/${encodeURIComponent(codigo)}`);
      if (data.activo === false) {
        setError('El producto está desactivado');
      } else {
        agregarAlCarrito(data);
        setCodigoBarras('');
        inputCodigoRef.current?.focus();
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Código de barras no registrado');
      } else {
        setError(err.response?.data?.mensaje || 'Error al buscar producto');
      }
    } finally {
      setBuscandoCodigo(false);
    }
  };

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

  const datosClienteValidos = () => true;

  const puedeVender =
    carrito.length > 0 &&
    (metodoPago !== 'Efectivo' || (montoRecibido && parseFloat(montoRecibido) >= total)) &&
    (metodoPago !== 'Yape' || yapeVerificado) &&
    datosClienteValidos();

  const resetear = () => {
    setCarrito([]);
    setMontoRecibido('');
    setYapeVerificado(false);
    setVentaExitosa(null);
    setBusqueda('');
    setCategoriaFiltro('');
    setPaginaActual(1);
    setCodigoBarras('');
    setError('');
    inputCodigoRef.current?.focus();
  };

  const realizarVenta = async () => {
    setError('');
    setLoading(true);

    try {
      const body = {
        cliente_id: null,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'Efectivo' ? parseFloat(montoRecibido) : null,
        yape_verificado: metodoPago === 'Yape' ? yapeVerificado : false,
        items: carrito.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
        })),
        tipo_comprobante: 'Boleta',
      };

      const { data } = await api.post('/ventas', body);
      setVentaExitosa(data);
      setModalComprobante(true);
      generarPDF(data);
      cargarProductos();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al realizar venta');
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = () => {
    if (ventaExitosa) generarPDF(ventaExitosa);
  };

  const cerrarComprobante = () => {
    setModalComprobante(false);
    resetear();
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>
          {esSoloLectura && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Modo consulta
            </span>
          )}
        </div>

        {!esSoloLectura && (
          <>
<div className="relative">
              <ScanLine className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                ref={inputCodigoRef}
                type="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarPorCodigo()}
                placeholder="Escanea o ingresa el código de barras..."
                autoFocus
                className="w-full rounded-2xl border-2 border-indigo-200 bg-white px-4 py-3 pl-10 text-base shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {buscandoCodigo && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-indigo-500" />
              )}
            </div>
          </>
        )}

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
                    Escanea un producto para agregarlo al carrito
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

        <button
          onClick={() => setMostrarLista(!mostrarLista)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {mostrarLista ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {mostrarLista ? 'Ocultar lista de productos' : 'Mostrar lista de productos'}
        </button>

        {mostrarLista && (
          <>
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
                    <div
                      key={p.id}
                      className={`relative flex flex-col items-start rounded-xl border p-3 text-left text-sm ${
                        sinStock
                          ? 'border-gray-100 bg-gray-50 opacity-50'
                          : esSoloLectura
                            ? 'border-gray-200 bg-white'
                            : enCarrito
                              ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                      } ${!esSoloLectura && !sinStock ? 'cursor-pointer transition-all' : ''}`}
                      onClick={() => !esSoloLectura && !sinStock && agregarAlCarrito(p)}
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
                    </div>
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
          </>
        )}
      </div>

      {esSoloLectura ? (
        <div className="w-80">
          <div className="sticky top-4 rounded-2xl border border-gray-100 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-medium text-amber-800">Modo consulta</p>
              <p className="text-xs text-amber-600">
                Puedes navegar los productos, pero no realizar ventas.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-80">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
                onChange={(e) => { setMetodoPago(e.target.value); setYapeVerificado(false); }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
              </select>

              {metodoPago === 'Yape' && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 p-4">
                    <img
                      src={`/CodigoQrYape.jpg?t=${Date.now()}`}
                      alt="Código QR Yape"
                      className="h-48 w-48 rounded-lg border border-indigo-100 bg-white object-contain p-1"
                    />
                    <p className="text-center text-xs text-indigo-600">
                      Escanea el código QR con tu app Yape para pagar
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <strong>Importante:</strong> Revisa la notificación de Yape en <strong>tu propio celular</strong>.
                    Confirma el pago solo si ves el monto correcto (<strong>S/. {total.toFixed(2)}</strong>).
                  </div>

                  {!yapeVerificado ? (
                    <button
                      onClick={() => setYapeVerificado(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Confirmar Yape recibido en mi celular
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                      <span className="font-medium">Yape verificado — Monto: S/. {total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}

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
        </div>
      )}
      {modalComprobante && ventaExitosa && (
        <ModalComprobante venta={ventaExitosa} onCerrar={cerrarComprobante} onDescargarPDF={descargarPDF} />
      )}
    </div>
  );
}
