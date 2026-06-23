import { useState, useEffect } from 'react';
import {
  ShoppingCart, DollarSign, TrendingUp, Package,
  AlertTriangle, ClipboardList, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';

function KpiCard({ titulo, valor, icono: Icono, color, prefijo }) {
  return (
    <div
      className="relative rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{titulo}</p>
          <p className="mt-1 text-3xl font-bold text-gray-800">
            {prefijo && <span className="text-lg">{prefijo} </span>}
            {typeof valor === 'number' ? valor.toFixed(2) : valor ?? 0}
          </p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: `${color}1A` }}
        >
          <Icono className="h-5 w-5" style={{ color }} />
        </div>
      </div>
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

function formatFecha(dia) {
  const date = new Date(dia + 'T00:00:00');
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const { usuario } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [inventario, setInventario] = useState(null);
  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [stockCritico, setStockCritico] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resVentas, resInventario, resPorDia, resStock, resTop] = await Promise.all([
          api.get('/reportes/ventas/resumen'),
          api.get('/reportes/inventario/resumen'),
          api.get('/reportes/ventas/por-dia'),
          api.get('/reportes/inventario/stock-critico', { params: { umbral: 5 } }),
          api.get('/reportes/ventas/productos-top', { params: { limite: 5 } }),
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
      }
    };
    fetchData();
  }, []);

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

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Dashboard' }]} />

      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido, {usuario?.nombre} — {fechaActual}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          titulo="Total Ventas del Mes"
          valor={kpis?.total_ventas}
          icono={ShoppingCart}
          color="#6366f1"
        />
        <KpiCard
          titulo="Ingresos del Mes"
          valor={kpis?.monto_total}
          icono={DollarSign}
          color="#10b981"
          prefijo="S./"
        />
        <KpiCard
          titulo="Ticket Promedio"
          valor={kpis?.promedio_venta}
          icono={TrendingUp}
          color="#f59e0b"
          prefijo="S./"
        />
        <KpiCard
          titulo="Productos Activos"
          valor={inventario?.total_productos}
          icono={Package}
          color="#3b82f6"
        />
        <KpiCard
          titulo="Sin Stock"
          valor={inventario?.productos_sin_stock}
          icono={AlertTriangle}
          color="#ef4444"
        />
        <KpiCard
          titulo="Solicitudes Pendientes"
          valor={inventario?.solicitudes_pendientes}
          icono={ClipboardList}
          color="#8b5cf6"
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
                tickFormatter={formatFecha}
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
          <h2 className="mb-4 font-semibold text-gray-700">Stock crítico</h2>
          {stockCritico.length > 0 ? (
            <ul className="space-y-3">
              {stockCritico.slice(0, 5).map((p, i) => (
                <li key={i} className="flex items-center justify-between">
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
    </div>
  );
}
