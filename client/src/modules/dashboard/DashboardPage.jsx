import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  AlertTriangle, ClipboardList, Loader2, RefreshCw, X, ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useStockSync } from '../../context/StockSyncContext';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import { formatMoneda, formatFecha, formatFechaHora, fechaLocalISO } from '../../utils/format';

function KpiCard({ titulo, valor, icono: Icono, color, prefijo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{ borderLeft: `4px solid ${color}`, '--tw-ring-color': color }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{titulo}</p>
          <p className="mt-1 text-3xl font-bold text-gray-800">
            {prefijo && <span className="text-lg">{prefijo} </span>}
            {typeof valor === 'number' ? valor.toFixed(2) : valor ?? 0}
          </p>
          <p
            className="mt-2 flex items-center gap-0.5 text-xs font-medium opacity-0 transition-opacity group-hover:opacity-100"
            style={{ color }}
          >
            Ver detalle <ChevronRight className="h-3 w-3" />
          </p>
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icono className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </button>
  );
}

// ─── Modal de detalle genérico ────────────────────────────────────────────────
// Mismo patrón visual que ya usan los modales de Productos/Solicitudes
// (overlay + panel rounded-2xl bg-white shadow-xl), reutilizado para las 6
// tarjetas del dashboard en vez de crear un modal distinto por cada una.
function ModalDetalle({ abierto, onCerrar, titulo, icono: Icono, color, cargando, error, children }) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCerrar}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}1A` }}
            >
              <Icono className="h-5 w-5" style={{ color }} />
            </div>
            <h2 className="text-lg font-bold text-gray-800">{titulo}</h2>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {cargando ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Contenidos de cada detalle ───────────────────────────────────────────────

function TablaVentas({ ventas, notaSuperior }) {
  if (!ventas || ventas.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">No hay ventas registradas este mes.</div>;
  }
  return (
    <div>
      {notaSuperior}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-400">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Cliente / Vendedor</th>
              <th className="px-3 py-2 font-medium">Método</th>
              <th className="px-3 py-2 font-medium">Monto</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => (
              <tr key={v.id} className="border-t border-gray-50">
                <td className="px-3 py-2 text-gray-500">{formatFechaHora(v.createdAt)}</td>
                <td className="px-3 py-2 text-gray-700">
                  {v.cliente?.nombre || v.usuario?.nombre || '—'}
                </td>
                <td className="px-3 py-2 text-gray-500">{v.metodo_pago}</td>
                <td className="px-3 py-2 font-medium text-gray-800">{formatMoneda(v.monto_total)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      v.estado === 'Anulada' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {v.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TablaIngresosPorMetodo({ datos }) {
  if (!datos || datos.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">No hay ingresos registrados este mes.</div>;
  }
  const total = datos.reduce((s, d) => s + d.monto_total, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-400">
            <th className="px-3 py-2 font-medium">Método de pago</th>
            <th className="px-3 py-2 font-medium">N° ventas</th>
            <th className="px-3 py-2 font-medium">Monto</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((d) => (
            <tr key={d.metodo_pago} className="border-t border-gray-50">
              <td className="px-3 py-2 text-gray-700">{d.metodo_pago}</td>
              <td className="px-3 py-2 text-gray-500">{d.total_ventas}</td>
              <td className="px-3 py-2 font-medium text-gray-800">{formatMoneda(d.monto_total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-gray-200 font-semibold text-gray-800">
            <td className="px-3 py-2">Total</td>
            <td className="px-3 py-2">{datos.reduce((s, d) => s + d.total_ventas, 0)}</td>
            <td className="px-3 py-2">{formatMoneda(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function TablaProductos({ productos, soloSinStock }) {
  const lista = soloSinStock ? productos.filter((p) => p.stock === 0) : productos;
  if (!lista || lista.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">
        {soloSinStock ? 'No hay productos sin stock. ✓' : 'No hay productos activos.'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-400">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium">Categoría</th>
            <th className="px-3 py-2 font-medium">Stock</th>
            <th className="px-3 py-2 font-medium">Precio</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id} className="border-t border-gray-50">
              <td className="px-3 py-2 text-gray-700">
                {p.nombre} <span className="text-gray-400">{p.marca}</span>
              </td>
              <td className="px-3 py-2 text-gray-500">{p.categoria?.nombre || '—'}</td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.stock === 0
                      ? 'bg-red-100 text-red-700'
                      : p.stock_minimo != null && p.stock <= p.stock_minimo
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {p.stock} und.
                </span>
              </td>
              <td className="px-3 py-2 text-gray-700">{formatMoneda(p.precio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TablaSolicitudes({ solicitudes }) {
  if (!solicitudes || solicitudes.length === 0) {
    return <div className="py-10 text-center text-sm text-gray-400">No hay solicitudes pendientes. ✓</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs uppercase text-gray-400">
            <th className="px-3 py-2 font-medium">Producto</th>
            <th className="px-3 py-2 font-medium">Cantidad</th>
            <th className="px-3 py-2 font-medium">Proveedor sugerido</th>
            <th className="px-3 py-2 font-medium">Solicitante</th>
            <th className="px-3 py-2 font-medium">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((s) => (
            <tr key={s.id} className="border-t border-gray-50">
              <td className="px-3 py-2 text-gray-700">
                {s.producto?.nombre} <span className="text-gray-400">{s.producto?.marca}</span>
              </td>
              <td className="px-3 py-2 text-gray-500">{s.cantidad} und(s)</td>
              <td className="px-3 py-2 text-gray-500">{s.proveedor?.nombre || '—'}</td>
              <td className="px-3 py-2 text-gray-500">{s.solicitante?.nombre}</td>
              <td className="px-3 py-2 text-gray-400">{formatFecha(s.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const date = label ? new Date(label + 'T00:00:00') : null;
  const dia = date
    ? `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`
    : label;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-md">
      <p className="text-sm font-medium text-gray-600">{dia}</p>
      <p className="text-sm font-bold text-[#6366f1]">
        S/. {Number(payload[0].value).toFixed(2)}
      </p>
    </div>
  );
}

// Título/ícono/color de cada modal de detalle, en el mismo orden que las
// tarjetas — para no repetir esta info en cada sitio donde se renderiza.
const MODAL_CONFIG = {
  ventas:      { titulo: 'Detalle de Ventas del Mes', icono: ShoppingCart, color: '#6366f1' },
  ingresos:    { titulo: 'Ingresos del Mes por Método de Pago', icono: DollarSign, color: '#10b981' },
  ticket:      { titulo: 'Ticket Promedio', icono: TrendingUp, color: '#f59e0b' },
  productos:   { titulo: 'Productos Activos', icono: Package, color: '#3b82f6' },
  sinStock:    { titulo: 'Productos Sin Stock', icono: AlertTriangle, color: '#ef4444' },
  solicitudes: { titulo: 'Solicitudes Pendientes', icono: ClipboardList, color: '#8b5cf6' },
};

function formatFechaEje(dia) {
  const date = new Date(dia + 'T00:00:00');
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Rango por defecto: mes en curso — coincide con lo que ya prometían los
// títulos de las tarjetas ("Total Ventas del Mes", "Ingresos del Mes"), que
// antes se llenaban con datos de *todo* el historial porque el fetch no
// mandaba ningún filtro de fecha al backend.
function primerDiaDelMes() {
  const hoy = new Date();
  return fechaLocalISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const { stockVersion } = useStockSync();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [inventario, setInventario] = useState(null);
  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [stockCritico, setStockCritico] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Filtro de fecha del dashboard: por defecto el mes en curso. Los inputs
  // (fechaInicioInput/fechaHastaInput) son el borrador que edita el usuario;
  // fechaInicio/fechaHasta son el rango efectivamente aplicado (el que se
  // manda al backend) — se separan para que escribir en los inputs no
  // dispare un refetch en cada tecla, solo al presionar "Aplicar".
  const [fechaInicio, setFechaInicio] = useState(primerDiaDelMes());
  const [fechaHasta, setFechaHasta] = useState(fechaLocalISO(new Date()));
  const [fechaInicioInput, setFechaInicioInput] = useState(fechaInicio);
  const [fechaHastaInput, setFechaHastaInput] = useState(fechaHasta);

  // Detalle por tarjeta: se carga bajo demanda al abrir cada modal (no en la
  // carga inicial del dashboard) y se cachea en estado para no re-pedirlo
  // cada vez que se reabre la misma tarjeta en la misma visita.
  const [modalActivo, setModalActivo] = useState(null); // 'ventas' | 'ingresos' | 'ticket' | 'productos' | 'sinStock' | 'solicitudes' | null
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState('');
  const [ventasDelMes, setVentasDelMes] = useState(null);
  const [ventasPorMetodo, setVentasPorMetodo] = useState(null);
  const [productosActivosDetalle, setProductosActivosDetalle] = useState(null);
  const [solicitudesPendientesDetalle, setSolicitudesPendientesDetalle] = useState(null);

  const fetchData = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefreshing(true);
    setError('');
    try {
      const rango = { fecha_inicio: fechaInicio, fecha_hasta: fechaHasta };
      const [resVentas, resInventario, resPorDia, resStock, resTop] = await Promise.all([
        api.get('/reportes/ventas/resumen', { params: rango }),
        api.get('/reportes/inventario/resumen'),
        api.get('/reportes/ventas/por-dia', { params: rango }),
        api.get('/reportes/inventario/stock-critico', { params: { umbral: 5 } }),
        api.get('/reportes/ventas/productos-top', { params: { ...rango, limite: 5 } }),
      ]);
      setKpis(resVentas.data);
      setInventario(resInventario.data);
      setVentasPorDia(Array.isArray(resPorDia.data) ? resPorDia.data : []);
      setStockCritico(Array.isArray(resStock.data) ? resStock.data : []);
      setProductosTop(Array.isArray(resTop.data) ? resTop.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fechaInicio, fechaHasta]);

  useEffect(() => { fetchData(); }, [fetchData, stockVersion]);

  useEffect(() => {
    const refetchOnFocus = () => { fetchData(true); };
    window.addEventListener('focus', refetchOnFocus);
    return () => window.removeEventListener('focus', refetchOnFocus);
  }, [fetchData]);

  // Al aplicar un nuevo rango de fechas, los detalles de las tarjetas
  // (ventas del mes, ingresos por método, etc.) quedan de un rango viejo —
  // se limpia la caché para que el próximo modal que se abra pida de nuevo
  // con el rango correcto en vez de mostrar datos de otro período.
  const aplicarFiltroFecha = () => {
    setFechaInicio(fechaInicioInput);
    setFechaHasta(fechaHastaInput);
    setVentasDelMes(null);
    setVentasPorMetodo(null);
  };

  const limpiarFiltroFecha = () => {
    const inicio = primerDiaDelMes();
    const hasta = fechaLocalISO(new Date());
    setFechaInicioInput(inicio);
    setFechaHastaInput(hasta);
    setFechaInicio(inicio);
    setFechaHasta(hasta);
    setVentasDelMes(null);
    setVentasPorMetodo(null);
  };

  // Carga el detalle de la tarjeta recién abierta, una sola vez (se cachea
  // en estado y no se vuelve a pedir si se cierra y se reabre la misma).
  useEffect(() => {
    if (!modalActivo) return;
    const cargarDetalle = async () => {
      setDetalleCargando(true);
      setDetalleError('');
      try {
        if ((modalActivo === 'ventas' || modalActivo === 'ticket') && !ventasDelMes) {
          // estado=Completada: el KPI de la tarjeta (kpis.total_ventas) viene
          // de resumenVentas(), que solo cuenta 'Completada' — sin este
          // filtro, este detalle traía además las Anuladas y el "mostrando
          // las primeras X de Y" (comparado contra kpis.total_ventas) quedaba
          // desalineado.
          const { data } = await api.get('/ventas', {
            params: { fecha_inicio: fechaInicio, fecha_hasta: fechaHasta, estado: 'Completada', limite: 100 },
          });
          setVentasDelMes(Array.isArray(data.data) ? data.data : []);
        } else if (modalActivo === 'ingresos' && !ventasPorMetodo) {
          const { data } = await api.get('/reportes/ventas/por-metodo-pago', {
            params: { fecha_inicio: fechaInicio, fecha_hasta: fechaHasta },
          });
          setVentasPorMetodo(Array.isArray(data) ? data : []);
        } else if ((modalActivo === 'productos' || modalActivo === 'sinStock') && !productosActivosDetalle) {
          const { data } = await api.get('/productos/activos');
          setProductosActivosDetalle(Array.isArray(data) ? data : []);
        } else if (modalActivo === 'solicitudes' && !solicitudesPendientesDetalle) {
          const { data } = await api.get('/inventario/solicitudes', { params: { estado: 'Pendiente' } });
          setSolicitudesPendientesDetalle(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setDetalleError(err.response?.data?.mensaje || 'Error al cargar el detalle');
      } finally {
        setDetalleCargando(false);
      }
    };
    cargarDetalle();
    // Deliberadamente solo depende de modalActivo: los demás son cachés que
    // se consultan (no se listan como dependencia) para pedir cada detalle
    // una única vez por visita a la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalActivo]);

  const cerrarModal = () => setModalActivo(null);

  // Navega a Productos con el filtro de estado de stock ya aplicado (y,
  // opcionalmente, el nombre del producto precargado en la búsqueda). Usa
  // query params — ProductosPage los lee una sola vez al montar y limpia la
  // URL después, así que no interfiere si el usuario ya tenía otros filtros
  // puestos en una visita anterior.
  const irAProductos = (alerta, buscar) => {
    const params = new URLSearchParams();
    if (alerta) params.set('alerta', alerta);
    if (buscar) params.set('buscar', buscar);
    const query = params.toString();
    navigate(query ? `/productos?${query}` : '/productos');
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
          <span className="text-sm text-gray-400">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-600">{error}</div>
      </div>
    );
  }

  const hoy = new Date();
  const fechaActual = hoy.toLocaleDateString('es-PE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const topVendido = productosTop.length > 0 ? Math.max(...productosTop.map((p) => p.total_vendido)) : 1;

  // Las tarjetas dicen "del Mes" solo mientras el rango aplicado sea, de
  // hecho, el mes en curso — con un rango distinto seria una etiqueta falsa.
  const esRangoMesActual = fechaInicio === primerDiaDelMes() && fechaHasta === fechaLocalISO(new Date());
  const etiquetaPeriodo = esRangoMesActual ? 'del Mes' : 'del Período';

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Dashboard' }]} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Bienvenido, {usuario?.nombre} — {fechaActual}
          </p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Filtro de fecha: afecta ventas/ingresos/ticket promedio/top productos.
          Inventario (productos activos, sin stock, stock crítico) es un
          estado actual, no algo que tenga sentido acotar por fecha. */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={fechaInicioInput}
            max={fechaHastaInput}
            onChange={(e) => setFechaInicioInput(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={fechaHastaInput}
            min={fechaInicioInput}
            max={fechaLocalISO(new Date())}
            onChange={(e) => setFechaHastaInput(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={aplicarFiltroFecha}
          className="rounded-lg bg-[#6366f1] px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Aplicar
        </button>
        <button
          onClick={limpiarFiltroFecha}
          className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
        >
          Este mes
        </button>
        <span className="text-xs text-gray-400">
          Mostrando ventas del {formatFecha(fechaInicio)} al {formatFecha(fechaHasta)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          titulo={`Total Ventas ${etiquetaPeriodo}`}
          valor={kpis?.total_ventas}
          icono={ShoppingCart}
          color="#6366f1"
          onClick={() => setModalActivo('ventas')}
        />
        <KpiCard
          titulo={`Ingresos ${etiquetaPeriodo}`}
          valor={kpis?.monto_total}
          icono={DollarSign}
          color="#10b981"
          prefijo="S./"
          onClick={() => setModalActivo('ingresos')}
        />
        <KpiCard
          titulo="Ticket Promedio"
          valor={kpis?.promedio_venta}
          icono={TrendingUp}
          color="#f59e0b"
          prefijo="S./"
          onClick={() => setModalActivo('ticket')}
        />
        <KpiCard
          titulo="Productos Activos"
          valor={inventario?.total_productos}
          icono={Package}
          color="#3b82f6"
          onClick={() => setModalActivo('productos')}
        />
        <KpiCard
          titulo="Sin Stock"
          valor={inventario?.productos_sin_stock}
          icono={AlertTriangle}
          color="#ef4444"
          onClick={() => setModalActivo('sinStock')}
        />
        <KpiCard
          titulo="Solicitudes Pendientes"
          valor={inventario?.solicitudes_pendientes}
          icono={ClipboardList}
          color="#8b5cf6"
          onClick={() => setModalActivo('solicitudes')}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">Ventas por día</h2>
        {ventasPorDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={ventasPorDia} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="ventasGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="fecha"
                tickFormatter={formatFechaEje}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `S/${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="monto_total"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#ventasGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-60 items-center justify-center text-sm text-gray-400">
            No hay ventas registradas aún
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-gray-700">Top 5 productos</h2>
          {productosTop.length > 0 ? (
            <ul className="space-y-4">
              {productosTop.map((p, i) => (
                <li key={i}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {p.nombre} <span className="font-normal text-gray-400">{p.marca}</span>
                    </span>
                    <span className="rounded-full bg-[#6366f1] px-2 py-0.5 text-xs font-medium text-white">
                      {p.total_vendido} und.
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${(p.total_vendido / topVendido) * 100}%`,
                        backgroundColor: '#6366f1',
                        opacity: 0.4,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No hay ventas registradas
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Stock crítico</h2>
            {stockCritico.length > 0 && (
              <button
                onClick={() => irAProductos('critico')}
                className="flex items-center gap-0.5 text-xs font-medium text-[#6366f1] hover:underline"
              >
                Ver todos en Productos <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
          {stockCritico.length > 0 ? (
            <ul className="space-y-1">
              {stockCritico.slice(0, 5).map((p, i) => (
                <li key={i}>
                  <button
                    onClick={() => irAProductos(p.stock === 0 ? 'agotado' : 'stockBajo', p.nombre)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition-colors hover:bg-gray-50"
                    title={`Ver "${p.nombre}" en Productos`}
                  >
                    <span className="text-sm text-gray-700">{p.nombre}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        p.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {p.stock === 0 ? 'Sin stock' : `${p.stock} und.`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-green-600">
              <span className="text-lg">✓</span> Todo el stock está en orden
            </div>
          )}
        </div>
      </div>

      {modalActivo && (
        <ModalDetalle
          abierto
          onCerrar={cerrarModal}
          titulo={
            modalActivo === 'ventas' ? `Detalle de Ventas ${etiquetaPeriodo}`
            : modalActivo === 'ingresos' ? `Ingresos ${etiquetaPeriodo} por Método de Pago`
            : MODAL_CONFIG[modalActivo].titulo
          }
          icono={MODAL_CONFIG[modalActivo].icono}
          color={MODAL_CONFIG[modalActivo].color}
          cargando={detalleCargando}
          error={detalleError}
        >
          {modalActivo === 'ventas' && (
            <TablaVentas
              ventas={ventasDelMes}
              notaSuperior={
                <p className="mb-3 text-sm text-gray-500">
                  {kpis?.total_ventas ?? 0} venta{kpis?.total_ventas === 1 ? '' : 's'} completada{kpis?.total_ventas === 1 ? '' : 's'} este mes.
                  {ventasDelMes && kpis?.total_ventas > ventasDelMes.length && (
                    <> Mostrando las primeras {ventasDelMes.length}.</>
                  )}
                </p>
              }
            />
          )}
          {modalActivo === 'ticket' && (
            <TablaVentas
              ventas={ventasDelMes ? [...ventasDelMes].sort((a, b) => b.monto_total - a.monto_total) : null}
              notaSuperior={
                <p className="mb-3 text-sm text-gray-500">
                  Promedio: <strong className="text-gray-700">{formatMoneda(kpis?.promedio_venta ?? 0)}</strong> sobre {kpis?.total_ventas ?? 0} venta(s) — ordenadas de mayor a menor monto.
                  {ventasDelMes && kpis?.total_ventas > ventasDelMes.length && (
                    <> Mostrando las primeras {ventasDelMes.length}.</>
                  )}
                </p>
              }
            />
          )}
          {modalActivo === 'ingresos' && <TablaIngresosPorMetodo datos={ventasPorMetodo} />}
          {modalActivo === 'productos' && <TablaProductos productos={productosActivosDetalle || []} />}
          {modalActivo === 'sinStock' && (
            <>
              <TablaProductos productos={productosActivosDetalle || []} soloSinStock />
              {(productosActivosDetalle || []).some((p) => p.stock === 0) && (
                <button
                  onClick={() => { cerrarModal(); irAProductos('agotado'); }}
                  className="mt-4 flex items-center gap-0.5 text-sm font-medium text-[#6366f1] hover:underline"
                >
                  Ver y gestionar en Productos <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
          {modalActivo === 'solicitudes' && <TablaSolicitudes solicitudes={solicitudesPendientesDetalle} />}
        </ModalDetalle>
      )}
    </div>
  );
}
