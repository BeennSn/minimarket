import { useState, useEffect } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import api from '../../utils/axios';

function formatearFecha(str) {
  if (!str) return '';
  const d = new Date(str);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} ${hh}:${min}`;
}

export default function InventarioPage() {
  const [tabActiva, setTabActiva] = useState('entradas');

  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [bajas, setBajas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [productoId, setProductoId] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

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

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3000);
  };

  const registrarEntrada = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/entradas', {
        producto_id: productoId,
        proveedor_id: proveedorId,
        cantidad: parseInt(cantidad, 10),
      });
      mostrarMensaje('✓ Entrada registrada correctamente');
      setProductoId('');
      setProveedorId('');
      setCantidad('');
      const [rP, rE] = await Promise.all([
        api.get('/productos/activos'),
        api.get('/inventario/entradas'),
      ]);
      setProductos(Array.isArray(rP.data) ? rP.data : []);
      setEntradas(Array.isArray(rE.data) ? rE.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al registrar entrada');
    } finally {
      setEnviando(false);
    }
  };

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
      mostrarMensaje('✓ Baja registrada correctamente');
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
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al registrar baja');
    } finally {
      setEnviando(false);
    }
  };

  const limpiarMensajes = () => { setError(''); setMensaje(''); };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setTabActiva('entradas'); limpiarMensajes(); }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tabActiva === 'entradas'
                ? 'bg-[#6366f1] text-white'
                : 'border border-gray-200 text-gray-500 bg-transparent'
            }`}
          >
            Entradas
          </button>
          <button
            onClick={() => { setTabActiva('bajas'); limpiarMensajes(); }}
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

      {mensaje && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle className="h-4 w-4" />
          {mensaje}
        </div>
      )}

      {tabActiva === 'entradas' ? (
        <>
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

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 pb-0">
              <h2 className="mb-3 font-semibold text-gray-700">Historial de Entradas</h2>
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
                      <th className="px-4 py-3 font-medium">Registrado por</th>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entradas.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 text-gray-800">
                          {e.producto?.nombre || e.producto_nombre}
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
                          {e.usuario?.nombre || e.registrado_por}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {formatearFecha(e.createdAt)}
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

          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 pb-0">
              <h2 className="mb-3 font-semibold text-gray-700">Historial de Bajas</h2>
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
                          {formatearFecha(b.createdAt)}
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
