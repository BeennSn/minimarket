import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronLeft, ChevronRight, LogIn, LogOut, Info, Loader2 } from 'lucide-react';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import { formatFechaHora } from '../../utils/format';

const TIPO_BADGE = {
  Login:  { color: 'bg-green-100 text-green-700', icon: LogIn,  label: 'Ingreso' },
  Logout: { color: 'bg-red-100 text-red-700',     icon: LogOut, label: 'Salida' },
  Otro:   { color: 'bg-gray-100 text-gray-600',   icon: Info,   label: 'Otro' },
};

export default function LogsAccesoPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pagina: 1, limite: 25, totalPaginas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroNombre, setFiltroNombre] = useState('');
  const [nombreAplicado, setNombreAplicado] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  const rangoFechaInvalido = Boolean(fechaInicio && fechaHasta && fechaInicio > fechaHasta);

  // filtroNombre es el texto que se está escribiendo; nombreAplicado es el que
  // realmente dispara la consulta (solo al filtrar/Enter), para no golpear la
  // API en cada tecla.
  const cargarLogs = useCallback(async () => {
    if (fechaInicio && fechaHasta && fechaInicio > fechaHasta) {
      setError('La fecha "Desde" no puede ser posterior a la fecha "Hasta"');
      setLogs([]);
      setPagination({ total: 0, pagina: 1, limite: 25, totalPaginas: 0 });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = { pagina: paginaActual, limite: 25 };
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (filtroTipo) params.tipo = filtroTipo;
      if (nombreAplicado) params.nombre = nombreAplicado;

      const { data } = await api.get('/logs-acceso', { params });
      setLogs(data.data || []);
      setPagination(data.pagination || { total: 0, pagina: 1, limite: 25, totalPaginas: 0 });
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar los logs de acceso');
    } finally {
      setLoading(false);
    }
  }, [paginaActual, fechaInicio, fechaHasta, filtroTipo, nombreAplicado]);

  useEffect(() => { cargarLogs(); }, [cargarLogs]);

  const handleFiltrar = () => { setNombreAplicado(filtroNombre.trim()); setPaginaActual(1); };
  const handleLimpiar = () => {
    setFechaInicio('');
    setFechaHasta('');
    setFiltroTipo('');
    setFiltroNombre('');
    setNombreAplicado('');
    setPaginaActual(1);
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Logs de Acceso' }]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Logs de Acceso</h1>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            max={fechaHasta || undefined}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            min={fechaInicio || undefined}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Tipo</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos</option>
            <option value="Login">Ingreso</option>
            <option value="Logout">Salida</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Usuario</label>
          <input
            type="text"
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFiltrar()}
            placeholder="Nombre del usuario..."
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          onClick={handleFiltrar}
          disabled={rangoFechaInvalido}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="mr-1 inline h-4 w-4" />
          Filtrar
        </button>
        <button
          onClick={handleLimpiar}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <X className="mr-1 inline h-4 w-4" />
          Limpiar
        </button>
        {rangoFechaInvalido && (
          <p className="w-full text-xs text-red-500">
            La fecha "Desde" no puede ser posterior a la fecha "Hasta"
          </p>
        )}
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : error ? (
          <div className="px-6 py-4 text-sm text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No se encontraron registros</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Rol</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Evento</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha / Hora</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const badge = TIPO_BADGE[log.tipo] || TIPO_BADGE.Otro;
                    const Icono = badge.icon;
                    return (
                      <tr key={log.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-800">{log.nombre_usuario}</td>
                        <td className="px-4 py-3 text-gray-600">{log.rol}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.color}`}>
                            <Icono className="h-3 w-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{formatFechaHora(log.fecha_hora)}</td>
                        <td className="px-4 py-3 text-gray-500">{log.detalle || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Mostrando {(pagination.pagina - 1) * pagination.limite + 1}–{Math.min(pagination.pagina * pagination.limite, pagination.total)} de {pagination.total} registros
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-sm text-gray-600">{paginaActual} / {pagination.totalPaginas}</span>
                  <button
                    onClick={() => setPaginaActual((p) => Math.min(pagination.totalPaginas, p + 1))}
                    disabled={paginaActual === pagination.totalPaginas}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
