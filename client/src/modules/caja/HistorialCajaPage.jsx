import { useState, useEffect } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, AlertCircle, Loader, X } from 'lucide-react';
import api from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => (n == null ? '—' : `S/ ${parseFloat(n).toFixed(2)}`);
const fmtFecha = (d) => d ? new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' }) : '—';

function BadgeDiff({ valor }) {
  if (valor == null) return <span className="text-gray-400">—</span>;
  const v = parseFloat(valor);
  if (v > 0) return <span className="font-semibold text-green-600">+{fmt(v)}</span>;
  if (v < 0) return <span className="font-semibold text-red-600">{fmt(v)}</span>;
  return <span className="font-semibold text-gray-500">S/ 0.00</span>;
}

function FilaTurno({ turno, puedeAprobar, onAprobado }) {
  const [expandido, setExpandido] = useState(false);
  const [detalle, setDetalle]     = useState(null);
  const [aprobando, setAprobando] = useState(false);

  const cargarDetalle = async () => {
    if (detalle) { setExpandido(!expandido); return; }
    try {
      const { data } = await api.get(`/caja/${turno.id}`);
      setDetalle(data);
      setExpandido(true);
    } catch {
      setExpandido(!expandido);
    }
  };

  const handleAprobar = async () => {
    setAprobando(true);
    try {
      const { data } = await api.patch(`/caja/${turno.id}/aprobar`);
      onAprobado(data);
    } catch {
      // silencioso — el padre recargará
    } finally {
      setAprobando(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={cargarDetalle}>
        <td className="px-4 py-3 text-sm text-gray-600">{fmtFecha(turno.fecha_apertura)}</td>
        <td className="px-4 py-3 text-sm font-medium text-gray-800">{turno.cajero?.nombre ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-right">{fmt(turno.monto_apertura)}</td>
        <td className="px-4 py-3 text-sm text-right">{fmt(turno.monto_esperado_efectivo)}</td>
        <td className="px-4 py-3 text-sm text-right"><BadgeDiff valor={turno.diferencia_efectivo} /></td>
        <td className="px-4 py-3 text-sm text-right">{fmt(turno.monto_esperado_yape)}</td>
        <td className="px-4 py-3 text-sm text-right"><BadgeDiff valor={turno.diferencia_yape} /></td>
        <td className="px-4 py-3 text-sm">
          {turno.estado === 'Abierto'
            ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Abierto</span>
            : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Cerrado</span>
          }
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          {turno.aprobador
            ? <span className="flex items-center gap-1 text-green-600 text-xs">
                <CheckCircle className="h-3.5 w-3.5" /> {turno.aprobador.nombre}
              </span>
            : puedeAprobar && turno.estado === 'Cerrado'
              ? <button
                  onClick={handleAprobar}
                  disabled={aprobando}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {aprobando ? '...' : 'Aprobar'}
                </button>
              : <span className="text-gray-400 text-xs">Pendiente</span>
          }
        </td>
        <td className="px-4 py-3 text-gray-400">
          {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>

      {expandido && detalle && (
        <tr>
          <td colSpan={10} className="bg-gray-50 px-8 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Movimientos del turno</p>
            {!detalle.movimientos?.length
              ? <p className="text-sm text-gray-400">Sin movimientos.</p>
              : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase border-b border-gray-200">
                      <th className="py-1 text-left">Tipo</th>
                      <th className="py-1 text-left">Descripción</th>
                      <th className="py-1 text-left">Método</th>
                      <th className="py-1 text-right">Monto</th>
                      <th className="py-1 text-right">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detalle.movimientos.map((m) => (
                      <tr key={m.id}>
                        <td className="py-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            m.tipo === 'Egreso' || m.tipo === 'Anulacion' ? 'bg-red-100 text-red-700' :
                            m.tipo === 'Venta'  ? 'bg-green-100 text-green-700' :
                            m.tipo === 'Ingreso'? 'bg-emerald-100 text-emerald-700' :
                                                  'bg-blue-100 text-blue-700'
                          }`}>{m.tipo}</span>
                        </td>
                        <td className="py-1.5 text-gray-700">{m.descripcion}</td>
                        <td className="py-1.5 text-gray-500">{m.metodo}</td>
                        <td className={`py-1.5 text-right font-medium ${m.tipo === 'Egreso' || m.tipo === 'Anulacion' ? 'text-red-600' : 'text-gray-800'}`}>
                          {m.tipo === 'Egreso' || m.tipo === 'Anulacion' ? '-' : '+'}{fmt(m.monto)}
                        </td>
                        <td className="py-1.5 text-right text-gray-400">
                          {new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            }
            {detalle.observaciones && (
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-medium">Observaciones:</span> {detalle.observaciones}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function HistorialCajaPage() {
  const { usuario }         = useAuth();
  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]   = useState('');

  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin]       = useState('');
  const [filtroEstado, setFiltroEstado]           = useState('');

  const puedeAprobar = ['Administrador', 'Gerente'].includes(usuario?.rol);

  const cargar = async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtroFechaInicio) params.fecha_inicio = filtroFechaInicio;
      if (filtroFechaFin)    params.fecha_hasta  = filtroFechaFin;
      if (filtroEstado)      params.estado       = filtroEstado;
      const { data } = await api.get('/caja/historial', { params });
      setTurnos(data);
    } catch {
      setError('No se pudo cargar el historial.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const limpiarFiltros = () => {
    setFiltroFechaInicio('');
    setFiltroFechaFin('');
    setFiltroEstado('');
    setCargando(true);
    setError('');
    api.get('/caja/historial')
      .then(({ data }) => setTurnos(data))
      .catch(() => setError('No se pudo cargar el historial.'))
      .finally(() => setCargando(false));
  };

  const hayFiltrosActivos = filtroFechaInicio || filtroFechaFin || filtroEstado;

  const handleAprobado = (turnoActualizado) => {
    setTurnos((prev) => prev.map((t) => (t.id === turnoActualizado.id ? turnoActualizado : t)));
  };

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Desde</label>
          <input type="date" value={filtroFechaInicio} onChange={(e) => setFiltroFechaInicio(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hasta</label>
          <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none">
            <option value="">Todos</option>
            <option value="Abierto">Abierto</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </div>
        <button onClick={cargar}
          className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
          Buscar
        </button>
        {hayFiltrosActivos && (
          <button
            onClick={limpiarFiltros}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {cargando ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs font-medium text-gray-500 uppercase">
                  <th className="px-4 py-3 text-left">Apertura</th>
                  <th className="px-4 py-3 text-left">Cajero</th>
                  <th className="px-4 py-3 text-right">Apertura (S/)</th>
                  <th className="px-4 py-3 text-right">Efec. esperado</th>
                  <th className="px-4 py-3 text-right">Dif. efec.</th>
                  <th className="px-4 py-3 text-right">Yape esperado</th>
                  <th className="px-4 py-3 text-right">Dif. Yape</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Aprobación</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {!turnos.length ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-400">
                      No hay turnos para mostrar.
                    </td>
                  </tr>
                ) : turnos.map((t) => (
                  <FilaTurno
                    key={t.id}
                    turno={t}
                    puedeAprobar={puedeAprobar}
                    onAprobado={handleAprobado}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
