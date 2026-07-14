import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Clock, TrendingUp, TrendingDown, Plus, X, CheckCircle, AlertCircle, Loader
} from 'lucide-react';
import api from '../../utils/axios';
import { sanitizarMonto } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

// Props comunes para los 4 inputs de dinero del módulo: bloquean "e"/"+"/"-"
// y sanean lo pegado, igual que en Ventas/Productos.
function propsMonto(value, setValue) {
  return {
    type: 'text',
    inputMode: 'decimal',
    value,
    onChange: (e) => setValue(sanitizarMonto(e.target.value)),
    onKeyDown: (e) => {
      if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
    },
    onPaste: (e) => {
      e.preventDefault();
      const texto = e.clipboardData.getData('text');
      setValue(sanitizarMonto(value + texto));
    },
  };
}

const fmt = (n) =>
  n == null ? '—' : `S/ ${parseFloat(n).toFixed(2)}`;

const TIPO_COLOR = {
  Apertura:  'bg-blue-100 text-blue-700',
  Venta:     'bg-green-100 text-green-700',
  Ingreso:   'bg-emerald-100 text-emerald-700',
  Egreso:    'bg-red-100 text-red-700',
  Anulacion: 'bg-red-100 text-red-700',
};

const ES_NEGATIVO = (tipo) => tipo === 'Egreso' || tipo === 'Anulacion';

// Debe coincidir con MONTO_MINIMO_APERTURA_CAJA en
// server/controllers/caja.controller.js (no hay config compartida
// cliente/servidor en este proyecto) — esto solo evita el viaje de red
// para el caso obvio; el backend es quien realmente lo exige.
const MONTO_MINIMO_APERTURA_CAJA = 200;

export default function CajaPage() {
  const { usuario } = useAuth();
  const [turno, setTurno]         = useState(undefined); // undefined = cargando, null = sin turno
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');

  // Modales
  const [modalAbrir, setModalAbrir]   = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [modalMov, setModalMov]       = useState(false);

  // Formulario apertura
  const [montoApertura, setMontoApertura] = useState('');

  // Formulario cierre
  const [contadoEfectivo, setContadoEfectivo] = useState('');
  const [contadoYape, setContadoYape]         = useState('');
  const [observaciones, setObservaciones]     = useState('');

  // Formulario movimiento manual
  const [movTipo, setMovTipo]       = useState('Ingreso');
  const [movMetodo, setMovMetodo]   = useState('Efectivo');
  const [movMonto, setMovMonto]     = useState('');
  const [movDesc, setMovDesc]       = useState('');

  const [enviando, setEnviando] = useState(false);

  const cargarTurno = useCallback(async () => {
    try {
      const { data } = await api.get('/caja/activo');
      setTurno(data);
    } catch {
      setError('No se pudo cargar el turno activo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarTurno(); }, [cargarTurno]);

  // ─── Abrir turno ────────────────────────────────────────────────────────────
  const handleAbrir = async (e) => {
    e.preventDefault();
    setError('');
    const monto = parseFloat(montoApertura);
    if (!Number.isFinite(monto) || monto < MONTO_MINIMO_APERTURA_CAJA) {
      setError(`El monto mínimo de apertura es S/ ${MONTO_MINIMO_APERTURA_CAJA.toFixed(2)}.`);
      return;
    }
    setEnviando(true);
    try {
      const { data } = await api.post('/caja/abrir', { monto_apertura: monto });
      setTurno(data);
      setModalAbrir(false);
      setMontoApertura('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al abrir turno');
    } finally {
      setEnviando(false);
    }
  };

  // ─── Cerrar turno ───────────────────────────────────────────────────────────
  const handleCerrar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.post('/caja/cerrar', {
        monto_contado_efectivo: parseFloat(contadoEfectivo),
        monto_contado_yape:     parseFloat(contadoYape || 0),
        observaciones,
      });
      setTurno(data);
      setModalCerrar(false);
      setContadoEfectivo('');
      setContadoYape('');
      setObservaciones('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cerrar turno');
    } finally {
      setEnviando(false);
    }
  };

  // ─── Registrar movimiento ───────────────────────────────────────────────────
  const handleMovimiento = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      const { data } = await api.post('/caja/movimientos', {
        tipo: movTipo, metodo: movMetodo,
        monto: parseFloat(movMonto), descripcion: movDesc,
      });
      setTurno((prev) => ({ ...prev, movimientos: [...(prev.movimientos || []), data] }));
      setModalMov(false);
      setMovMonto(''); setMovDesc('');
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar movimiento');
    } finally {
      setEnviando(false);
    }
  };

  // ─── Cálculos en tiempo real (turno abierto) ────────────────────────────────
  const calcularTotales = () => {
    if (!turno?.movimientos) return { efectivo: 0, yape: 0 };
    let efectivo = 0, yape = 0;
    for (const m of turno.movimientos) {
      const monto = parseFloat(m.monto);
      if (ES_NEGATIVO(m.tipo)) {
        if (m.metodo === 'Efectivo') efectivo -= monto;
        if (m.metodo === 'Yape')     yape     -= monto;
      } else if (m.metodo === 'Efectivo') {
        efectivo += monto;
      } else if (m.metodo === 'Yape') {
        yape += monto;
      }
    }
    return { efectivo, yape };
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const totales = turno?.estado === 'Abierto' ? calcularTotales() : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ── Sin turno abierto ── */}
      {!turno && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
          <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-lg font-semibold text-gray-700">No tienes un turno abierto</h3>
          <p className="mt-1 text-sm text-gray-500">Abre tu turno para comenzar a registrar ventas en caja.</p>
          <button
            onClick={() => setModalAbrir(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Abrir turno
          </button>
        </div>
      )}

      {/* ── Turno abierto ── */}
      {turno?.estado === 'Abierto' && (
        <>
          {/* Cabecera */}
          <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-semibold text-gray-800">Turno en curso</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  <Clock className="inline h-3.5 w-3.5 mr-1" />
                  Apertura: {new Date(turno.fecha_apertura).toLocaleString('es-PE')}
                </p>
                <p className="text-sm text-gray-500">
                  Cajero: <span className="font-medium">{turno.cajero?.nombre}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalMov(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" /> Movimiento
                </button>
                <button
                  onClick={() => setModalCerrar(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <X className="h-4 w-4" /> Cerrar turno
                </button>
              </div>
            </div>
          </div>

          {/* Totales en tiempo real */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Apertura</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{fmt(turno.monto_apertura)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Efectivo acumulado</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{fmt(totales.efectivo)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 font-medium uppercase">Yape acumulado</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{fmt(totales.yape)}</p>
            </div>
          </div>

          {/* Movimientos */}
          <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700">Movimientos del turno</h3>
            </div>
            {!turno.movimientos?.length ? (
              <p className="p-6 text-center text-sm text-gray-400">Sin movimientos aún.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {turno.movimientos.map((m) => (
                  <li key={m.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIPO_COLOR[m.tipo]}`}>
                        {m.tipo}
                      </span>
                      <span className="text-gray-700">{m.descripcion}</span>
                      <span className="text-gray-400 text-xs">{m.metodo}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-semibold ${ES_NEGATIVO(m.tipo) ? 'text-red-600' : 'text-gray-800'}`}>
                        {ES_NEGATIVO(m.tipo) ? '-' : '+'}{fmt(m.monto)}
                      </span>
                      <span className="text-gray-400 text-xs">
                        {new Date(m.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* ── Turno cerrado (vista de resumen post-cierre) ── */}
      {turno?.estado === 'Cerrado' && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Turno cerrado</h3>
            {turno.aprobador && (
              <span className="ml-auto rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Aprobado por {turno.aprobador.nombre}
              </span>
            )}
          </div>
          <ResumenCierre turno={turno} />
          <button
            onClick={() => { setTurno(null); }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Abrir nuevo turno
          </button>
        </div>
      )}

      {/* ── Modal: Abrir turno ── */}
      {modalAbrir && (
        <Modal titulo="Abrir turno" onClose={() => setModalAbrir(false)}>
          <form onSubmit={handleAbrir} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto inicial en caja (S/)
              </label>
              <input
                {...propsMonto(montoApertura, setMontoApertura)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ej: 200.00"
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-400">
                Mínimo S/ {MONTO_MINIMO_APERTURA_CAJA.toFixed(2)}, para poder dar vueltos.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalAbrir(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={enviando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {enviando ? 'Abriendo...' : 'Abrir turno'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Cerrar turno ── */}
      {modalCerrar && (
        <Modal titulo="Cerrar turno" onClose={() => setModalCerrar(false)}>
          <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            Cuenta el efectivo y Yape físico antes de continuar.
          </div>
          <form onSubmit={handleCerrar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efectivo contado (S/)</label>
                <input
                  {...propsMonto(contadoEfectivo, setContadoEfectivo)}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="0.00" autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yape contado (S/)</label>
                <input
                  {...propsMonto(contadoYape, setContadoYape)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
              <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ej: faltaron 5 soles, billetes mojados, etc."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalCerrar(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={enviando}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {enviando ? 'Cerrando...' : 'Cerrar turno'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Movimiento manual ── */}
      {modalMov && (
        <Modal titulo="Registrar movimiento" onClose={() => setModalMov(false)}>
          <form onSubmit={handleMovimiento} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={movTipo} onChange={(e) => setMovTipo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="Ingreso">Ingreso</option>
                  <option value="Egreso">Egreso</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método</label>
                <select value={movMetodo} onChange={(e) => setMovMetodo(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="Efectivo">Efectivo</option>
                  <option value="Yape">Yape</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/)</label>
              <input
                {...propsMonto(movMonto, setMovMonto)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="0.00" autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input type="text" required
                value={movDesc} onChange={(e) => setMovDesc(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="Ej: Pago de limpieza"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setModalMov(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={enviando}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {enviando ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Componente auxiliar: resumen de cierre ─────────────────────────────────────
function ResumenCierre({ turno }) {
  const fila = (label, esperado, contado, diferencia) => (
    <tr key={label}>
      <td className="py-2 text-sm text-gray-600">{label}</td>
      <td className="py-2 text-sm text-right font-medium">{fmt(esperado)}</td>
      <td className="py-2 text-sm text-right font-medium">{fmt(contado)}</td>
      <td className={`py-2 text-sm text-right font-semibold ${
        diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-600'
      }`}>
        {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
      </td>
    </tr>
  );

  return (
    <table className="w-full">
      <thead>
        <tr className="text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
          <th className="py-2 text-left">Concepto</th>
          <th className="py-2 text-right">Esperado</th>
          <th className="py-2 text-right">Contado</th>
          <th className="py-2 text-right">Diferencia</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {fila('Efectivo', turno.monto_esperado_efectivo, turno.monto_contado_efectivo, turno.diferencia_efectivo)}
        {fila('Yape',     turno.monto_esperado_yape,     turno.monto_contado_yape,     turno.diferencia_yape)}
      </tbody>
    </table>
  );
}

// ── Modal genérico ─────────────────────────────────────────────────────────────
function Modal({ titulo, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-800">{titulo}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
