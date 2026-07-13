import { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Loader2, FileText, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../utils/axios';
import { useStockSync } from '../../context/StockSyncContext';
import Breadcrumb from '../../components/Breadcrumb';

function formatFecha(dia) {
  if (!dia) return '';
  const date = new Date(dia + 'T00:00:00');
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatFechaCompleta(dia) {
  if (!dia) return '';
  const date = new Date(dia + 'T00:00:00');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre'];
  return `${date.getDate()} de ${meses[date.getMonth()]} del ${date.getFullYear()}`;
}

export default function ReportesPage() {
  const { stockVersion } = useStockSync();
  const [resumen, setResumen] = useState(null);
  const [ventasPorDia, setVentasPorDia] = useState([]);
  const [metodoPago, setMetodoPago] = useState([]);
  const [productosTop, setProductosTop] = useState([]);
  const [margenProductos, setMargenProductos] = useState([]);
  const [mermasPorMotivo, setMermasPorMotivo] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [generando, setGenerando] = useState(false);
  const datosRef = useRef(null);

  // Stock crítico
  const [stockCritico, setStockCritico] = useState([]);
  const [umbral, setUmbral] = useState(5);
  const [umbralInput, setUmbralInput] = useState('5');
  const [cargandoStock, setCargandoStock] = useState(false);


  const buildParams = useCallback(() => {
    const params = {};
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaHasta) params.fecha_hasta = fechaHasta;
    return params;
  }, [fechaInicio, fechaHasta]);

  const cargarDatos = useCallback(async (esRefresco = false) => {
    if (esRefresco) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const params = buildParams();
      const [rRes, rDia, rMet, rTop, rMargen, rMermas] = await Promise.all([
        api.get('/reportes/ventas/resumen', { params }),
        api.get('/reportes/ventas/por-dia', { params }),
        api.get('/reportes/ventas/por-metodo-pago', { params }),
        api.get('/reportes/ventas/productos-top', { params: { ...params, limite: 10 } }),
        api.get('/reportes/margen/productos', { params }),
        api.get('/reportes/inventario/mermas-por-motivo', { params }),
      ]);
      setResumen(rRes.data);
      setVentasPorDia(Array.isArray(rDia.data) ? rDia.data : []);
      setMetodoPago(Array.isArray(rMet.data) ? rMet.data : []);
      setProductosTop(Array.isArray(rTop.data) ? rTop.data : []);
      setMargenProductos(Array.isArray(rMargen.data) ? rMargen.data : []);
      setMermasPorMotivo(Array.isArray(rMermas.data) ? rMermas.data : []);
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al cargar reportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  useEffect(() => {
    datosRef.current = { resumen, ventasPorDia, metodoPago, productosTop, margenProductos, mermasPorMotivo, fechaInicio, fechaHasta };
  }, [resumen, ventasPorDia, metodoPago, productosTop, margenProductos, mermasPorMotivo, fechaInicio, fechaHasta]);

  const cargarStockCritico = useCallback(async (u) => {
    setCargandoStock(true);
    try {
      const { data } = await api.get('/reportes/inventario/stock-critico', { params: { umbral: u } });
      setStockCritico(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al cargar stock crítico:', err);
    } finally {
      setCargandoStock(false);
    }
  }, []);

  useEffect(() => { cargarStockCritico(umbral); }, [cargarStockCritico, umbral, stockVersion]);

  const aplicarUmbral = () => {
    const val = parseInt(umbralInput, 10);
    if (!isNaN(val) && val >= 0) {
      setUmbral(val);
    }
  };

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const d = datosRef.current;
      const hoy = new Date();
      const tituloFecha = `Reporte del ${d.fechaInicio ? formatFechaCompleta(d.fechaInicio) : 'inicio'} al ${d.fechaHasta ? formatFechaCompleta(d.fechaHasta) : formatFechaCompleta(hoy.toISOString().split('T')[0])}`;

      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('MiniMarket', 105, y, { align: 'center' });
      y += 8;
      doc.setFontSize(14);
      doc.text('Reporte de Ventas', 105, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(tituloFecha, 105, y, { align: 'center' });
      y += 12;

      // ─── Resumen ────────────────────────────────────────────────────────────
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen de Ventas', 14, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const r = d.resumen || {};
      doc.text(`Total de Ventas: ${r.total_ventas ?? 0}`, 20, y); y += 6;
      doc.text(`Ingresos Totales: S/ ${Number(r.monto_total ?? 0).toFixed(2)}`, 20, y); y += 6;
      doc.text(`Ticket Promedio: S/ ${Number(r.promedio_venta ?? 0).toFixed(2)}`, 20, y); y += 12;

      // ─── Ventas por día ────────────────────────────────────────────────────
      if (d.ventasPorDia?.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Ventas por Día', 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Fecha', 'Ventas', 'Monto Total']],
          body: d.ventasPorDia.map((v) => [
            formatFecha(v.fecha),
            String(v.total_ventas ?? 0),
            `S/ ${Number(v.monto_total ?? 0).toFixed(2)}`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 9 },
          margin: { left: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ─── Ventas por método de pago ─────────────────────────────────────────
      if (d.metodoPago?.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Ventas por Método de Pago', 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Método', 'Ventas', 'Monto Total']],
          body: d.metodoPago.map((m) => [
            m.metodo_pago,
            String(m.total_ventas ?? 0),
            `S/ ${Number(m.monto_total ?? 0).toFixed(2)}`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 9 },
          margin: { left: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ─── Top productos ─────────────────────────────────────────────────────
      if (d.productosTop?.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Top 10 Productos Más Vendidos', 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['#', 'Producto', 'Marca', 'Unidades', 'Ingresos']],
          body: d.productosTop.map((p, i) => [
            String(i + 1),
            p.nombre || '',
            p.marca || '',
            String(p.total_vendido ?? 0),
            `S/ ${Number(p.ingreso_total ?? 0).toFixed(2)}`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          styles: { fontSize: 9 },
          margin: { left: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ─── Margen por producto ───────────────────────────────────────────────
      if (d.margenProductos?.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Margen por Producto', 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Producto', 'Marca', 'Categoría', 'Vendido', 'Ingreso', 'Costo', 'Margen', 'Margen %']],
          body: d.margenProductos.map((p) => [
            p.nombre || '',
            p.marca || '',
            p.categoria || '—',
            String(p.total_vendido ?? 0),
            `S/ ${Number(p.ingreso_total ?? 0).toFixed(2)}`,
            `S/ ${Number(p.costo_total ?? 0).toFixed(2)}`,
            `S/ ${Number(p.margen ?? 0).toFixed(2)}`,
            p.margen_pct != null ? `${Number(p.margen_pct).toFixed(1)}%` : '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8 },
          margin: { left: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ─── Mermas por motivo ─────────────────────────────────────────────────
      if (d.mermasPorMotivo?.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text('Mermas por Motivo', 14, y);
        y += 4;
        autoTable(doc, {
          startY: y,
          head: [['Motivo', 'N° Bajas', 'Cantidad Total', 'Costo Valorizado']],
          body: d.mermasPorMotivo.map((m) => [
            m.motivo || '',
            String(m.num_bajas ?? 0),
            String(m.cantidad_total ?? 0),
            `S/ ${Number(m.costo_valorizado ?? 0).toFixed(2)}`,
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 9 },
          margin: { left: 14 },
        });
        y = doc.lastAutoTable.finalY + 12;
      }

      // ─── Footer ────────────────────────────────────────────────────────────
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Generado el ${hoy.toLocaleDateString('es-PE')} a las ${hoy.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`, 105, 285, { align: 'center' });

      doc.save('reporte_ventas.pdf');
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
          <span className="text-sm text-gray-400">Cargando reportes...</span>
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

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Reportes' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reporte de Ventas</h1>
          <p className="mt-1 text-sm text-gray-500">Genera reportes detallados de ventas en PDF</p>
        </div>
        <button
          onClick={generarPDF}
          disabled={generando}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
        >
          {generando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {generando ? 'Generando...' : 'Descargar Reporte PDF'}
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Desde</label>
            <input
              type="date" value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Hasta</label>
            <input
              type="date" value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <button
            onClick={() => cargarDatos(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
          >
            {refreshing && <Loader2 className="h-4 w-4 animate-spin" />}
            Aplicar filtros
          </button>
          <button
            onClick={() => { setFechaInicio(''); setFechaHasta(''); cargarDatos(true); }}
            disabled={refreshing}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* ─── Resumen ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Ventas</p>
              <p className="mt-1 text-3xl font-bold text-gray-800">{resumen?.total_ventas ?? 0}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50">
              <ShoppingCart className="h-5 w-5 text-[#6366f1]" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="mt-1 text-3xl font-bold text-gray-800">S/ {Number(resumen?.monto_total ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500">Ticket Promedio</p>
              <p className="mt-1 text-3xl font-bold text-gray-800">S/ {Number(resumen?.promedio_venta ?? 0).toFixed(2)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50">
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Top 10 Productos ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Top 10 productos más vendidos</h2>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Se incluirá en el PDF</span>
          </div>
        </div>
        {productosTop.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Unidades vendidas</th>
                  <th className="px-4 py-3 font-medium">Ingresos totales</th>
                </tr>
              </thead>
              <tbody>
                {productosTop.map((p, i) => {
                  const maxVendido = productosTop.length > 0 ? Math.max(...productosTop.map((x) => x.total_vendido)) : 1;
                  return (
                    <tr key={p.producto_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        {i === 0 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-yellow-400 text-xs font-bold text-white">1</span>
                        ) : i === 1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs font-bold text-white">2</span>
                        ) : i === 2 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-white">3</span>
                        ) : (
                          <span className="text-sm text-gray-400">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800">{p.nombre}</p>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: `${(p.total_vendido / maxVendido) * 100}%`, backgroundColor: '#6366f1', opacity: 0.2 }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-[#6366f1] px-2.5 py-0.5 text-xs font-medium text-white">
                          {p.total_vendido}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        S/ {Number(p.ingreso_total).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No hay datos de ventas aún
          </div>
        )}
      </div>

      {/* ─── Margen por Producto ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-700">Margen por Producto</h2>
            <p className="mt-0.5 text-xs text-gray-400">Solo productos con costo registrado en sus lotes de compra</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Se incluirá en el PDF</span>
          </div>
        </div>
        {margenProductos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium text-right">Vendido</th>
                  <th className="px-4 py-3 font-medium text-right">Ingreso</th>
                  <th className="px-4 py-3 font-medium text-right">Costo</th>
                  <th className="px-4 py-3 font-medium text-right">Margen S/.</th>
                  <th className="px-4 py-3 font-medium text-right">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {margenProductos.map((p, i) => {
                  const positivo = (p.margen ?? 0) > 0;
                  return (
                    <tr key={p.producto_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                      <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                      <td className="px-4 py-3 text-gray-500">{p.categoria || '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{p.total_vendido}</td>
                      <td className="px-4 py-3 text-right text-gray-800">S/ {Number(p.ingreso_total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-gray-500">S/ {Number(p.costo_total).toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>
                        S/ {Number(p.margen).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {p.margen_pct != null ? (
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${positivo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {Number(p.margen_pct).toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <span>Sin datos de costo en el período.</span>
            <span className="text-xs">Registra el costo unitario al ingresar mercadería para ver el margen.</span>
          </div>
        )}
      </div>

      {/* ─── Ventas por día ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">Ventas por día</h2>
        {ventasPorDia.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Ventas</th>
                  <th className="px-4 py-3 font-medium">Monto Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasPorDia.map((v, i) => (
                  <tr key={v.fecha || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{formatFecha(v.fecha)}</td>
                    <td className="px-4 py-3 text-gray-600">{v.total_ventas ?? 0}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">S/ {Number(v.monto_total ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No hay ventas en el período seleccionado
          </div>
        )}
      </div>

      {/* ─── Ventas por método de pago ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-semibold text-gray-700">Ventas por método de pago</h2>
        {metodoPago.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Método de Pago</th>
                  <th className="px-4 py-3 font-medium">Ventas</th>
                  <th className="px-4 py-3 font-medium">Monto Total</th>
                </tr>
              </thead>
              <tbody>
                {metodoPago.map((m, i) => (
                  <tr key={m.metodo_pago || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-gray-700">{m.metodo_pago}</td>
                    <td className="px-4 py-3 text-gray-600">{m.total_ventas ?? 0}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">S/ {Number(m.monto_total ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No hay datos de ventas en el período seleccionado
          </div>
        )}
      </div>

      {/* ─── Stock Crítico ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-gray-700">Stock Crítico</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Umbral:</label>
            <input
              type="number"
              min="0"
              value={umbralInput}
              onChange={(e) => setUmbralInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aplicarUmbral()}
              className="w-20 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={aplicarUmbral}
              disabled={cargandoStock}
              className="flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {cargandoStock
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <RefreshCw className="h-3.5 w-3.5" />
              }
              Actualizar
            </button>
          </div>
        </div>

        {cargandoStock ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#6366f1]" />
          </div>
        ) : stockCritico.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-6 text-sm font-medium text-emerald-700">
            <CheckCircle className="h-5 w-5" />
            ✓ Todo el stock está en orden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Stock actual</th>
                  <th className="px-4 py-3 font-medium">Mínimo aplicado</th>
                </tr>
              </thead>
              <tbody>
                {stockCritico.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                    <td className="px-4 py-3 text-gray-500">{p.categoria?.nombre || '—'}</td>
                    <td className="px-4 py-3">
                      {p.stock === 0 ? (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          Sin stock
                        </span>
                      ) : (
                        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                          {p.stock} und(s)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.umbral_aplicado}{p.stock_minimo == null && <span className="ml-1 text-xs text-gray-300">(global)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-xs text-gray-400">
              Mostrando productos cuyo stock está por debajo de su propio "Stock Mínimo" (si está definido) o del umbral global de {umbral} en caso contrario.
            </p>
          </div>
        )}
      </div>

      {/* ─── Mermas por Motivo ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">Mermas por Motivo</h2>
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <FileText className="h-4 w-4" />
            <span>Se incluirá en el PDF</span>
          </div>
        </div>
        {mermasPorMotivo.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-red-500 text-white">
                  <th className="px-4 py-3 font-medium">Motivo</th>
                  <th className="px-4 py-3 font-medium text-right">N° Bajas</th>
                  <th className="px-4 py-3 font-medium text-right">Cantidad Total</th>
                  <th className="px-4 py-3 font-medium text-right">Costo Valorizado</th>
                </tr>
              </thead>
              <tbody>
                {mermasPorMotivo.map((m, i) => (
                  <tr key={m.motivo || i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-800">{m.motivo}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{m.num_bajas}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{m.cantidad_total}</td>
                    <td className="px-4 py-3 text-right text-gray-800">S/ {Number(m.costo_valorizado).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center text-sm text-gray-400">
            No hay bajas de inventario en el período seleccionado
          </div>
        )}
      </div>
    </div>
  );
}
