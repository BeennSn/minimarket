import { useState, useEffect, useCallback } from 'react';
import { Loader2, Filter, X } from 'lucide-react';
import api from '../../utils/axios';
import { formatFechaHora } from '../../utils/format';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

export default function InventarioPage() {
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const [tabActiva, setTabActiva] = useState('entradas');

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Formulario de registro
  const [productoId, setProductoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Filtros — Entradas
  const [filtroEntradaDesde, setFiltroEntradaDesde] = useState('');
  const [filtroEntradaHasta, setFiltroEntradaHasta] = useState('');
  const [filtroEntradaProducto, setFiltroEntradaProducto] = useState('');
  const [cargandoEntradas, setCargandoEntradas] = useState(false);

  // Filtros — Bajas
  const [filtroBajaDesde, setFiltroBajaDesde] = useState('');
  const [filtroBajaHasta, setFiltroBajaHasta] = useState('');
  const [filtroBajaProducto, setFiltroBajaProducto] = useState('');
  const [cargandoBajas, setCargandoBajas] = useState(false);

  // ─── Carga inicial ────────────────────────────────────────────────────────

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [rP, rProv, rE, rB] = await Promise.all([
        api.get('/productos/activos'),
        api.get('/proveedores'),
        api.get('/inventario/entradas'),
        api.get('/inventario/bajas'),
      ]);
      setProductos(Array.isArray(rP.data) ? rP.data : []);
      setProveedores(Array.isArray(rProv.data) ? rProv.data : []);
      setEntradas(Array.isArray(rE.data) ? rE.data : []);
      setBajas(Array.isArray(rB.data) ? rB.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // ─── Filtrar entradas ─────────────────────────────────────────────────────

  const filtrarEntradas = useCallback(async () => {
    setCargandoEntradas(true);
    try {
      const params = {};
      if (filtroEntradaDesde) params.fecha_inicio = filtroEntradaDesde;
      if (filtroEntradaHasta) params.fecha_hasta = filtroEntradaHasta;
      if (filtroEntradaProducto) params.producto_id = filtroEntradaProducto;
      const { data } = await api.get('/inventario/entradas', { params });
      setEntradas(Array.isArray(data) ? data : []);
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || 'Error al filtrar entradas');
    } finally {
      setCargandoEntradas(false);
    }
  }, [filtroEntradaDesde, filtroEntradaHasta, filtroEntradaProducto]);

  const limpiarFiltrosEntradas = () => {
    setFiltroEntradaDesde('');
    setFiltroEntradaHasta('');
    setFiltroEntradaProducto('');
    api.get('/inventario/entradas').then(({ data }) =>
      setEntradas(Array.isArray(data) ? data : [])
    );
  };

  // ─── Filtrar bajas ────────────────────────────────────────────────────────

  const filtrarBajas = useCallback(async () => {
    setCargandoBajas(true);
    try {
      const params = {};
      if (filtroBajaDesde) params.fecha_inicio = filtroBajaDesde;
      if (filtroBajaHasta) params.fecha_hasta = filtroBajaHasta;
      if (filtroBajaProducto) params.producto_id = filtroBajaProducto;
      const { data } = await api.get('/inventario/bajas', { params });
      setBajas(Array.isArray(data) ? data : []);
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || 'Error al filtrar bajas');
    } finally {
      setCargandoBajas(false);
    }
  }, [filtroBajaDesde, filtroBajaHasta, filtroBajaProducto]);

  const limpiarFiltrosBajas = () => {
    setFiltroBajaDesde('');
    setFiltroBajaHasta('');
    setFiltroBajaProducto('');
    api.get('/inventario/bajas').then(({ data }) =>
      setBajas(Array.isArray(data) ? data : [])
    );
  };

  // ─── Registro de entrada ──────────────────────────────────────────────────

  const registrarEntrada = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/entradas', {
        producto_id: productoId,
        proveedor_id: proveedorId,
        cantidad: parseInt(cantidad, 10),
        fecha_vencimiento: fechaVencimiento || null,
      });
      mostrarExito('Entrada registrada correctamente');
      setProductoId('');
      setProveedorId('');
      setCantidad('');
      setFechaVencimiento('');
      const [rP, rE] = await Promise.all([
        api.get('/productos/activos'),
        api.get('/inventario/entradas'),
      ]);
      setProductos(Array.isArray(rP.data) ? rP.data : []);
      setEntradas(Array.isArray(rE.data) ? rE.data : []);
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al registrar entrada');
    } finally {
      setEnviando(false);
    }
  };

  // ─── Registro de baja ─────────────────────────────────────────────────────

  const registrarBaja = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/bajas', {
        producto_id: productoId,
        cantidad: parseInt(cantidad, 10),
        motivo,
      });
      mostrarExito('Baja registrada correctamente');
      setProductoId('');
      setCantidad('');
      setMotivo('');
      const [rP, rB] = await Promise.all([
        api.get('/productos/activos'),
        api.get('/inventario/bajas'),
      ]);
      setProductos(Array.isArray(rP.data) ? rP.data : []);
      setBajas(Array.isArray(rB.data) ? rB.data : []);
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al registrar baja');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <Spinner texto="Cargando inventario..." />;
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Inventario' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setTabActiva('entradas'); setProductoId(''); setCantidad(''); }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tabActiva === 'entradas'
                ? 'bg-[#6366f1] text-white'
                : 'border border-gray-200 text-gray-500 bg-transparent'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => { setTabActiva('bajas'); setProductoId(''); setCantidad(''); }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tabActiva === 'bajas'
                ? 'bg-[#6366f1] text-white'
                : 'border border-gray-200 text-gray-500 bg-transparent'
            }`}
          >
            Bajas
          </button>
        </div>
      </div>

      {tabActiva === 'entradas' ? (
        <>
          {/* ─── Formulario Entrada ──────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-700">Registrar Entrada</h2>
            <form onSubmit={registrarEntrada} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Seleccionar...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} - {p.marca}
                      </option>
                    ))}
                  </select>
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
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.ruc})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Vencimiento</label>
                  <input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={enviando}
                  className="flex items-center gap-2 rounded-lg bg-[#10b981] px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-600 disabled:opacity-70"
                >
                  {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar Entrada
                </button>
              </div>
            </form>
          </div>

          {/* ─── Historial Entradas ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 pb-0">
              <h2 className="mb-3 font-semibold text-gray-700">Historial de Entradas</h2>

              {/* Filtros de historial */}
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Filter className="h-4 w-4" />
                  Filtrar:
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
                  <input
                    type="date"
                    value={filtroEntradaDesde}
                    onChange={(e) => setFiltroEntradaDesde(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
                  <input
                    type="date"
                    value={filtroEntradaHasta}
                    onChange={(e) => setFiltroEntradaHasta(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Producto</label>
                  <select
                    value={filtroEntradaProducto}
                    onChange={(e) => setFiltroEntradaProducto(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Todos</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} - {p.marca}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={filtrarEntradas}
                  disabled={cargandoEntradas}
                  className="flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
                >
                  {cargandoEntradas ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
                  Aplicar
                </button>
                {(filtroEntradaDesde || filtroEntradaHasta || filtroEntradaProducto) && (
                  <button
                    onClick={limpiarFiltrosEntradas}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {entradas.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                No hay entradas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#6366f1] text-white">
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Proveedor</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Vencimiento</th>
                      <th className="px-4 py-3 font-medium">Registrado por</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-800">
                          {e.producto?.nombre || e.producto_nombre}
                          {e.solicitud_id && (
                            <span className="ml-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                              Solicitud #{e.solicitud_id}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {e.proveedor?.nombre || e.proveedor_nombre}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            +{e.cantidad} und(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {e.fecha_vencimiento || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {e.usuario?.nombre || e.registrado_por}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatFechaHora(e.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* ─── Formulario Baja ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-semibold text-gray-700">Registrar Baja</h2>
            <form onSubmit={registrarBaja} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Producto</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Seleccionar...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} - {p.marca} (stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
                  <input
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    required
                    placeholder="Ej: Producto vencido, dañado..."
                    className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
              )}
              <div className="flex justify-end">
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

          {/* ─── Historial Bajas ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 pb-0">
              <h2 className="mb-3 font-semibold text-gray-700">Historial de Bajas</h2>

              {/* Filtros de historial */}
              <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                  <Filter className="h-4 w-4" />
                  Filtrar:
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
                  <input
                    type="date"
                    value={filtroBajaDesde}
                    onChange={(e) => setFiltroBajaDesde(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
                  <input
                    type="date"
                    value={filtroBajaHasta}
                    onChange={(e) => setFiltroBajaHasta(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Producto</label>
                  <select
                    value={filtroBajaProducto}
                    onChange={(e) => setFiltroBajaProducto(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    <option value="">Todos</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} - {p.marca}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={filtrarBajas}
                  disabled={cargandoBajas}
                  className="flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
                >
                  {cargandoBajas ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
                  Aplicar
                </button>
                {(filtroBajaDesde || filtroBajaHasta || filtroBajaProducto) && (
                  <button
                    onClick={limpiarFiltrosBajas}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
                  >
                    <X className="h-3.5 w-3.5" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            {bajas.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-gray-400">
                No hay bajas registradas
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-[#6366f1] text-white">
                      <th className="px-4 py-3 font-medium">Producto</th>
                      <th className="px-4 py-3 font-medium">Cantidad</th>
                      <th className="px-4 py-3 font-medium">Motivo</th>
                      <th className="px-4 py-3 font-medium">Registrado por</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bajas.map((b, i) => (
                      <tr key={b.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-800">
                          {b.producto?.nombre || b.producto_nombre}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            -{b.cantidad} und(s)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{b.motivo}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {b.usuario?.nombre || b.registrado_por}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatFechaHora(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
