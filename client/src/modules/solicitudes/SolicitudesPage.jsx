import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, PackageCheck, Plus, X, Check } from 'lucide-react';
import api from '../../utils/axios';
import { formatFecha } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const ESTADOS = ['Todos', 'Pendiente', 'Aprobada', 'Rechazada', 'Completada'];

const BADGE_COLORS = {
  Pendiente: 'bg-[#fef3c7] text-[#92400e]',
  Aprobada: 'bg-[#d1fae5] text-[#065f46]',
  Rechazada: 'bg-[#fee2e2] text-[#991b1b]',
  Completada: 'bg-[#f3f4f6] text-[#6b7280]',
};

function ModalCrearSolicitud({ abierto, onCerrar, productos, proveedores, onCreada }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) {
      setProductoId('');
      setCantidad('');
      setProveedorId('');
      setError('');
    }
  }, [abierto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/solicitudes', {
        producto_id: productoId,
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

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Nueva Solicitud de Reposición</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <option key={p.id} value={p.id}>{p.nombre} - {p.marca} (Stock: {p.stock})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad solicitada</label>
            <input
              type="number" min="1" value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor sugerido (opcional)</label>
            <select
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
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

function ModalAprobar({ abierto, onCerrar, solicitud, proveedores, onAprobada }) {
  const [proveedorId, setProveedorId] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) {
      setProveedorId('');
      setFechaEstimada('');
      setError('');
    }
  }, [abierto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.patch(`/inventario/solicitudes/${solicitud.id}/aprobar`, {
        proveedor_id: proveedorId,
        fecha_estimada: fechaEstimada,
      });
      onAprobada();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al aprobar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto || !solicitud) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Aprobar Solicitud</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {solicitud.producto?.nombre} - {solicitud.producto?.marca}</p>
          <p><span className="font-medium text-gray-700">Cantidad solicitada:</span> {solicitud.cantidad} und(s)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha estimada de llegada</label>
            <input
              type="date" value={fechaEstimada}
              onChange={(e) => setFechaEstimada(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button
              type="submit" disabled={enviando}
              className="flex items-center gap-2 rounded-lg bg-[#10b981] px-4 py-2 text-sm text-white transition-colors hover:bg-emerald-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Aprobar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalRechazar({ abierto, onCerrar, solicitud, onRechazada }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto) {
      setMotivo('');
      setError('');
    }
  }, [abierto]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.patch(`/inventario/solicitudes/${solicitud.id}/rechazar`, {
        motivo_rechazo: motivo,
      });
      onRechazada();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al rechazar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  if (!abierto || !solicitud) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Rechazar Solicitud</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {solicitud.producto?.nombre} - {solicitud.producto?.marca}</p>
          <p><span className="font-medium text-gray-700">Cantidad solicitada:</span> {solicitud.cantidad} und(s)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo del rechazo</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              placeholder="Explica el motivo del rechazo..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {error && <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
          <div className="flex justify-end">
            <button
              type="submit" disabled={enviando}
              className="flex items-center gap-2 rounded-lg bg-[#ef4444] px-4 py-2 text-sm text-white transition-colors hover:bg-red-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Rechazar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalCompletar({ abierto, onCerrar, solicitud, onCompletada }) {
  const [cantidadRecibida, setCantidadRecibida] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && solicitud) {
      setCantidadRecibida(String(solicitud.cantidad));
      setFechaVencimiento('');
      setError('');
    }
  }, [abierto, solicitud]);

  if (!abierto || !solicitud) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cr = parseInt(cantidadRecibida, 10);
    if (!cr || cr <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    setEnviando(true);
    setError('');
    try {
      await api.patch(`/inventario/solicitudes/${solicitud.id}/completar`, {
        cantidad_recibida: cr,
        fecha_vencimiento: fechaVencimiento || null,
      });
      onCompletada();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al completar solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Registrar Entrada</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {solicitud.producto?.nombre}</p>
          <p><span className="font-medium text-gray-700">Cantidad solicitada:</span> {solicitud.cantidad} und(s)</p>
          {solicitud.proveedor && (
            <p><span className="font-medium text-gray-700">Proveedor:</span> {solicitud.proveedor.nombre}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Cantidad recibida
            </label>
            <input
              type="number"
              min={1}
              value={cantidadRecibida}
              onChange={(e) => setCantidadRecibida(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              Si llegó parcial, ingresa la cantidad real recibida
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fecha de vencimiento <span className="text-gray-400">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Entrada
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SolicitudesPage() {
  const { usuario } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const rol = usuario?.rol;

  const [solicitudes, setSolicitudes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [modalCrear, setModalCrear] = useState(false);
  const [modalAprobar, setModalAprobar] = useState(false);
  const [modalRechazar, setModalRechazar] = useState(false);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState(null);
  const [modalCompletar, setModalCompletar] = useState(null);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const [rS, rP, rProv] = await Promise.all([
        api.get('/inventario/solicitudes'),
        api.get('/productos/activos'),
        api.get('/proveedores'),
      ]);
      setSolicitudes(Array.isArray(rS.data) ? rS.data : []);
      setProductos(Array.isArray(rP.data) ? rP.data : []);
      setProveedores(Array.isArray(rProv.data) ? rProv.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const solicitudesFiltradas = filtroEstado === 'Todos'
    ? solicitudes
    : solicitudes.filter((s) => s.estado === filtroEstado);

  const puedeCrear = rol === 'Almacenero' || rol === 'Administrador';

  if (loading) {
    return <Spinner texto="Cargando solicitudes..." />;
  }

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Solicitudes' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Solicitudes de Reposición</h1>
        {puedeCrear && (
          <button
            onClick={() => setModalCrear(true)}
            className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
          >
            <Plus className="h-4 w-4" />
            Nueva Solicitud
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-wrap gap-2">
        {ESTADOS.map((est) => (
          <button
            key={est}
            onClick={() => setFiltroEstado(est)}
            className={`rounded-lg px-4 py-1.5 text-sm transition-colors ${
              filtroEstado === est
                ? 'bg-[#6366f1] text-white'
                : 'border border-gray-200 bg-transparent text-gray-500 hover:border-gray-300'
            }`}
          >
            {est}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        {solicitudesFiltradas.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No hay solicitudes registradas
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Cantidad</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Proveedor</th>
                <th className="px-4 py-3 font-medium">Fecha Est.</th>
                <th className="px-4 py-3 font-medium">Solicitante</th>
                <th className="px-4 py-3 font-medium">Aprobado por</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudesFiltradas.map((s, i) => (
                <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-gray-800">
                    {s.producto?.nombre} - {s.producto?.marca}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{s.cantidad} und(s)</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_COLORS[s.estado] || ''}`}>
                      {s.estado}
                    </span>
                    {s.estado === 'Rechazada' && s.motivo_rechazo && (
                      <p className="mt-1 text-xs text-gray-400 italic">{s.motivo_rechazo}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.proveedor ? (
                      <span className="text-gray-800">{s.proveedor.nombre}</span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.fecha_estimada ? (
                      <span className="text-gray-800">{formatFecha(s.fecha_estimada)}</span>
                    ) : (
                      <span className="text-gray-400">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{s.solicitante?.nombre}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {s.aprobador?.nombre ? (
                      <span>{s.aprobador.nombre}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {s.estado === 'Pendiente' && (rol === 'Administrador' || rol === 'Gerente') && (
                        <>
                          <button
                            onClick={() => { setSolicitudSeleccionada(s); setModalAprobar(true); }}
                            className="rounded p-1 text-[#10b981] transition-colors hover:bg-green-50"
                            title="Aprobar"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => { setSolicitudSeleccionada(s); setModalRechazar(true); }}
                            className="rounded p-1 text-[#ef4444] transition-colors hover:bg-red-50"
                            title="Rechazar"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      {s.estado === 'Aprobada' && (rol === 'Almacenero' || rol === 'Administrador') && (
                        <button
                          onClick={() => setModalCompletar(s)}
                          className="rounded p-1 text-[#6366f1] transition-colors hover:bg-indigo-50"
                          title="Completar"
                        >
                          <PackageCheck className="h-5 w-5" />
                        </button>
                      )}
                      {s.estado === 'Completada' && (
                        <span className="rounded p-1 text-gray-400" title="Completada">
                          <Check className="h-5 w-5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalCrearSolicitud
        abierto={modalCrear}
        onCerrar={() => setModalCrear(false)}
        productos={productos}
        proveedores={proveedores}
        onCreada={() => {
          setModalCrear(false);
          mostrarExito('Solicitud creada correctamente');
          cargarDatos();
        }}
      />

      <ModalAprobar
        abierto={modalAprobar}
        onCerrar={() => { setModalAprobar(false); setSolicitudSeleccionada(null); }}
        solicitud={solicitudSeleccionada}
        proveedores={proveedores}
        onAprobada={() => {
          setModalAprobar(false);
          setSolicitudSeleccionada(null);
          mostrarExito('Solicitud aprobada correctamente');
          cargarDatos();
        }}
      />

      <ModalRechazar
        abierto={modalRechazar}
        onCerrar={() => { setModalRechazar(false); setSolicitudSeleccionada(null); }}
        solicitud={solicitudSeleccionada}
        onRechazada={() => {
          setModalRechazar(false);
          setSolicitudSeleccionada(null);
          mostrarExito('Solicitud rechazada correctamente');
          cargarDatos();
        }}
      />

      <ModalCompletar
        abierto={!!modalCompletar}
        onCerrar={() => setModalCompletar(null)}
        solicitud={modalCompletar}
        onCompletada={() => {
          setModalCompletar(null);
          mostrarExito('Mercadería registrada y stock actualizado correctamente');
          cargarDatos();
        }}
      />
    </div>
  );
}
