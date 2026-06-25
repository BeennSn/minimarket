import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, EyeOff, Eye, X, Trash2, AlertTriangle, Loader2, Package } from 'lucide-react';
import api from '../../utils/axios';
import { formatMoneda, formatStock, formatFecha } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const DIAS_MINIMOS_VENCIMIENTO = 30;

function ModalProducto({ abierto, onCerrar, onGuardar, productoEditando, categorias }) {
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const esCreacion = !productoEditando;

  const fechaMinima = useMemo(() => {
    const f = new Date();
    f.setDate(f.getDate() + DIAS_MINIMOS_VENCIMIENTO);
    return f.toISOString().split('T')[0];
  }, []);

  useEffect(() => {
    if (abierto) {
      if (productoEditando) {
        setNombre(productoEditando.nombre || '');
        setMarca(productoEditando.marca || '');
        setCategoriaId(productoEditando.categoria?.id ?? productoEditando.categoria_id ?? productoEditando.categoriaId ?? '');
        setPrecio(productoEditando.precio ?? '');
        setStock(productoEditando.stock ?? '');
        setCodigoBarras(productoEditando.codigo_barras ?? '');
        setFechaVencimiento(productoEditando.fecha_vencimiento ?? '');
      } else {
        const fv = new Date();
        fv.setFullYear(fv.getFullYear() + 2);
        setNombre('');
        setMarca('');
        setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
        setPrecio('');
        setStock('');
        setCodigoBarras('');
        setFechaVencimiento(fv.toISOString().split('T')[0]);
      }
      setError('');
    }
  }, [abierto, productoEditando, categorias]);

  if (!abierto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (fechaVencimiento && fechaVencimiento < fechaMinima) {
      setError(`La fecha de vencimiento debe ser al menos ${DIAS_MINIMOS_VENCIMIENTO} días a partir de hoy`);
      return;
    }

    setLoading(true);

    try {
      const payload = { nombre, marca, categoria_id: categoriaId, precio: parseFloat(precio), codigo_barras: codigoBarras || null, fecha_vencimiento: fechaVencimiento || null };
      if (esCreacion) payload.stock = parseInt(stock, 10) || 0;

      if (esCreacion) {
        await api.post('/productos', payload);
      } else {
        await api.put(`/productos/${productoEditando.id}`, payload);
      }
      onGuardar();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            {esCreacion ? 'Nuevo Producto' : 'Editar Producto'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S./</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Código de Barras</label>
          <input
            type="text"
            value={codigoBarras}
            onChange={(e) => setCodigoBarras(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {esCreacion && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              min={fechaMinima}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            {esCreacion && (
              <p className="mt-1 text-xs text-gray-400">Prellenado con +2 años por defecto</p>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalSolicitud({ abierto, onCerrar, producto, proveedores, onCreada }) {
  const [cantidad, setCantidad] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && producto) {
      setCantidad('');
      setProveedorId(producto.proveedor?.id ?? '');
      setError('');
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/solicitudes', {
        producto_id: producto.id,
        cantidad: parseInt(cantidad, 10),
        proveedor_id: proveedorId || undefined,
      });
      onCreada();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al crear solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Solicitar Reposición</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {producto.nombre} - {producto.marca}</p>
          <p><span className="font-medium text-gray-700">Stock actual:</span> {producto.stock} und(s)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad a solicitar</label>
            <input
              type="number" min="1" value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar...</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button
              type="submit" disabled={enviando}
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Solicitud
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalBaja({ abierto, onCerrar, producto, onRegistrada }) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('Vencido');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && producto) {
      setCantidad('1');
      setMotivo('Vencido');
      setError('');
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const c = parseInt(cantidad, 10);
    if (!c || c <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    if (c > (producto.stock || 0)) { setError(`Stock insuficiente (disponible: ${producto.stock})`); return; }
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/bajas', {
        producto_id: producto.id,
        cantidad: c,
        motivo,
      });
      onRegistrada();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar baja');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Dar de Baja</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {producto.nombre}</p>
          <p><span className="font-medium text-gray-700">Stock actual:</span> {producto.stock} und(s)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={producto.stock}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => setCantidad(String(producto.stock))}
                className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
              >
                Todo
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="Vencido">Vencido</option>
              <option value="Dañado">Dañado</option>
              <option value="Rotura">Rotura</option>
              <option value="Caducado">Caducado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex items-center gap-2 rounded-lg bg-[#ef4444] px-4 py-2 text-sm text-white transition-colors hover:bg-red-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const { usuario } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [confirmarEstado, setConfirmarEstado] = useState(null);
  const [modalBaja, setModalBaja] = useState(null);
  const [modalSolicitud, setModalSolicitud] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [datosVencimiento, setDatosVencimiento] = useState([]);
  const [filtroAlerta, setFiltroAlerta] = useState('Todos');
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 12;
  const rol = usuario?.rol;
  const puedeDarBaja = rol === 'Almacenero' || rol === 'Administrador';

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [resProductos, resCategorias, resVenc, resProv] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
        api.get('/productos/vencer?dias=30').catch(() => ({ data: [] })),
        api.get('/proveedores').catch(() => ({ data: [] })),
      ]);
      setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
      setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
      setDatosVencimiento(Array.isArray(resVenc.data) ? resVenc.data : []);
      setProveedores(Array.isArray(resProv.data) ? resProv.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const abrirCrear = () => { setProductoEditando(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setProductoEditando(p); setModalAbierto(true); };

  const handleGuardar = () => {
    setModalAbierto(false);
    setProductoEditando(null);
    cargarDatos();
  };

  const esActivo = (p) => p.activo === true || p.activo == null;

  const toggleEstado = async () => {
    if (!confirmarEstado) return;
    const p = confirmarEstado;
    const activo = esActivo(p);
    const accion = activo ? 'desactivar' : 'reactivar';
    setConfirmarEstado(null);
    try {
      await api.patch(`/productos/${p.id}/${accion}`);
      mostrarExito(`Producto ${accion}do correctamente`);
      cargarDatos();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || `Error al ${accion} producto`);
    }
  };

  const conteoAlertas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);

    const idsVencEntrada = new Set(datosVencimiento.filter((d) => d.stock_vencido > 0).map((d) => d.id));
    const idsPorVencerEntrada = new Set(datosVencimiento.filter((d) => d.stock_por_vencer > 0).map((d) => d.id));

    const idsVencProducto = new Set();
    const idsPorVencerProducto = new Set();
    for (const p of productos) {
      if (!p.fecha_vencimiento) continue;
      const fv = new Date(p.fecha_vencimiento + 'T00:00:00');
      if (fv < hoy) idsVencProducto.add(p.id);
      else if (fv <= limite) idsPorVencerProducto.add(p.id);
    }

    const stockBajo = productos.filter((p) => esActivo(p) && p.stock <= 5).length;
    const idsVencidos = new Set([...idsVencEntrada, ...idsVencProducto]);
    const idsPorVencer = new Set([...idsPorVencerEntrada, ...idsPorVencerProducto]);
    return { stockBajo, idsVencidos, idsPorVencer };
  }, [productos, datosVencimiento]);

  const filtrados = productos.filter((p) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    const fvProd = p.fecha_vencimiento ? new Date(p.fecha_vencimiento + 'T00:00:00') : null;

    const coincideTexto =
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase());
    const prodCategoriaId = p.categoria?.id ?? p.categoria_id;
    const coincideCategoria =
      filtroCategoria === 'Todas' || String(prodCategoriaId) === String(filtroCategoria);
    const coincideEstado =
      filtroEstado === 'Todos' ||
      (filtroEstado === 'Activo' && esActivo(p)) ||
      (filtroEstado === 'Inactivo' && !esActivo(p));
    const coincideAlerta =
      filtroAlerta === 'Todos' ||
      (filtroAlerta === 'Stock bajo' && esActivo(p) && p.stock <= 5) ||
      (filtroAlerta === 'Vencido' && (conteoAlertas.idsVencidos.has(p.id) || (fvProd && fvProd < hoy))) ||
      (filtroAlerta === 'Por vencer' && (conteoAlertas.idsPorVencer.has(p.id) || (fvProd && fvProd >= hoy && fvProd <= limite)));
    return coincideTexto && coincideCategoria && coincideEstado && coincideAlerta;
  });

  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroCategoria, filtroEstado, filtroAlerta]);

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_POR_PAGINA);
  const productosPagina = filtrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  const stockColor = (stock) => {
    if (stock === 0) return 'bg-red-50';
    if (stock <= 5) return 'bg-amber-50';
    return '';
  };

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Productos' }]} />

      {(conteoAlertas.stockBajo > 0 || conteoAlertas.idsVencidos.size > 0 || conteoAlertas.idsPorVencer.size > 0) && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {conteoAlertas.stockBajo > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Stock bajo' ? 'Todos' : 'Stock bajo')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Stock bajo'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.stockBajo} producto{conteoAlertas.stockBajo !== 1 ? 's' : ''} con stock bajo
            </button>
          )}
          {conteoAlertas.idsVencidos.size > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Vencido' ? 'Todos' : 'Vencido')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Vencido'
                  ? 'bg-red-200 text-red-900'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.idsVencidos.size} producto{conteoAlertas.idsVencidos.size !== 1 ? 's' : ''} vencido{conteoAlertas.idsVencidos.size !== 1 ? 's' : ''}
            </button>
          )}
          {conteoAlertas.idsPorVencer.size > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Por vencer' ? 'Todos' : 'Por vencer')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Por vencer'
                  ? 'bg-yellow-200 text-yellow-900'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.idsPorVencer.size} producto{conteoAlertas.idsPorVencer.size !== 1 ? 's' : ''} por vencer
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>

        <select
          value={filtroAlerta}
          onChange={(e) => setFiltroAlerta(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Sin filtro</option>
          <option value="Stock bajo">Stock bajo (&le;5)</option>
          <option value="Vencido">Vencido</option>
          <option value="Por vencer">Por vencer</option>
        </select>
      </div>

      {loading ? (
        <Spinner texto="Cargando productos..." />
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay productos registrados
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPagina.map((p, i) => (
                  <tr key={p.id} className={`${stockColor(p.stock)} ${i % 2 === 0 ? 'bg-white' : ''}`}>
                    <td className="px-4 py-3 text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.categoria?.nombre || categorias.find((c) => String(c.id) === String(p.categoria?.id))?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{formatMoneda(p.precio)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatStock(p.stock)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.fecha_vencimiento ? formatFecha(p.fecha_vencimiento) : '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          esActivo(p)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {esActivo(p) ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirEditar(p)}
                          className="rounded-lg p-1.5 text-[#6366f1] transition-colors hover:bg-indigo-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmarEstado(p)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            esActivo(p)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={esActivo(p) ? 'Desactivar' : 'Reactivar'}
                        >
                          {esActivo(p) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        {puedeDarBaja && (
                          <button
                            onClick={() => setModalBaja(p)}
                            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                            title="Dar de baja"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {esActivo(p) && p.stock <= 5 && (
                          <button
                            onClick={() => setModalSolicitud(p)}
                            className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                            title="Solicitar reposición"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-200" />
                Sin stock
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 border border-amber-200" />
                Stock crítico (&le;5)
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-white border border-gray-300" />
                Stock normal
              </div>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 text-gray-500">
                  Pág. {paginaActual} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ModalProducto
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setProductoEditando(null); }}
        onGuardar={handleGuardar}
        productoEditando={productoEditando}
        categorias={categorias}
      />

      <ModalBaja
        abierto={!!modalBaja}
        onCerrar={() => setModalBaja(null)}
        producto={modalBaja}
        onRegistrada={() => {
          setModalBaja(null);
          mostrarExito('Baja registrada correctamente');
          cargarDatos();
        }}
      />

      <ModalSolicitud
        abierto={!!modalSolicitud}
        onCerrar={() => setModalSolicitud(null)}
        producto={modalSolicitud}
        proveedores={proveedores}
        onCreada={() => {
          setModalSolicitud(null);
          mostrarExito('Solicitud de reposición creada');
          cargarDatos();
        }}
      />

      <ConfirmDialog
        abierto={!!confirmarEstado}
        titulo={confirmarEstado ? `${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} producto` : ''}
        mensaje={confirmarEstado ? `¿${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} producto "${confirmarEstado.nombre}"?` : ''}
        onConfirmar={toggleEstado}
        onCancelar={() => setConfirmarEstado(null)}
        colorConfirmar={confirmarEstado && esActivo(confirmarEstado) ? '#ef4444' : '#10b981'}
      />
    </div>
  );
}
