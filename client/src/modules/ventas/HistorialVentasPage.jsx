import { useState, useEffect, useCallback } from 'react';
import { Search, X, ChevronLeft, ChevronRight, Download, Eye, FileText, CheckCircle, XCircle, Banknote, Smartphone, Loader2, Ban } from 'lucide-react';
import api from '../../utils/axios';
import Breadcrumb from '../../components/Breadcrumb';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';
import { useAuth } from '../../context/AuthContext';
import { useStockSync } from '../../context/StockSyncContext';

export default function HistorialVentasPage() {
  const { usuario } = useAuth();
  const { notificarCambioStock } = useStockSync();
  const puedeAnular = usuario?.rol === 'Administrador' || usuario?.rol === 'Gerente';
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();

  const [ventas, setVentas] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pagina: 1, limite: 25, totalPaginas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [ventaAAnular, setVentaAAnular] = useState(null);
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  const rangoFechaInvalido = Boolean(fechaInicio && fechaHasta && fechaInicio > fechaHasta);

  const cargarVentas = useCallback(async () => {
    if (fechaInicio && fechaHasta && fechaInicio > fechaHasta) {
      setError('La fecha "Desde" no puede ser posterior a la fecha "Hasta"');
      setVentas([]);
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
      if (filtroMetodo) params.metodo_pago = filtroMetodo;

      const { data } = await api.get('/ventas', { params });
      setVentas(data.data || []);
      setPagination(data.pagination || { total: 0, pagina: 1, limite: 25, totalPaginas: 0 });
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al carrar historial');
    } finally {
      setLoading(false);
    }
  }, [paginaActual, fechaInicio, fechaHasta, filtroMetodo]);

  useEffect(() => { cargarVentas(); }, [cargarVentas]);

  const handleFiltrar = () => { setPaginaActual(1); };
  const handleLimpiar = () => { setFechaInicio(''); setFechaHasta(''); setFiltroMetodo(''); setPaginaActual(1); };

  const exportarCSV = async () => {
    if (rangoFechaInvalido) {
      mostrarError('La fecha "Desde" no puede ser posterior a la fecha "Hasta"');
      return;
    }
    setExportando(true);
    try {
      const params = {};
      if (fechaInicio) params.fecha_inicio = fechaInicio;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      if (filtroMetodo) params.metodo_pago = filtroMetodo;

      const { data } = await api.get('/ventas', { params });
      const todas = data.data || [];

      const headers = ['N° Venta', 'Fecha', 'Hora', 'Cajero', 'Método Pago', 'Monto Total', 'Yape Verificado', 'Cant. Productos'];
      const rows = todas.map((v) => [
        v.id,
        new Date(v.createdAt).toLocaleDateString('es-PE'),
        new Date(v.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        v.usuario?.nombre || '-',
        v.metodo_pago,
        Number(v.monto_total).toFixed(2),
        v.metodo_pago === 'Yape' ? (v.yape_verificado ? 'Sí' : 'No') : '-',
        (v.detalles || []).length,
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((c) => `"${c}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `historial_ventas_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/ventas/${id}`);
      setDetalleVenta(data);
    } catch (err) {
      setError('Error al carrar detalle de venta');
    }
  };

  const confirmarAnular = async () => {
    if (!motivoAnular.trim()) {
      mostrarError('Debes indicar un motivo de anulación');
      return;
    }
    setAnulando(true);
    try {
      await api.patch(`/ventas/${ventaAAnular.id}/anular`, { motivo: motivoAnular.trim() });
      mostrarExito(`Venta #${String(ventaAAnular.id).padStart(6, '0')} anulada`);
      setVentaAAnular(null);
      setMotivoAnular('');
      cargarVentas();
      notificarCambioStock();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || 'Error al anular la venta');
    } finally {
      setAnulando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Historial de Ventas</h1>
        <button
          onClick={exportarCSV}
          disabled={exportando || rangoFechaInvalido}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar Excel
        </button>
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
          <label className="mb-1 block text-xs font-medium text-gray-500">Método de pago</label>
          <select
            value={filtroMetodo}
            onChange={(e) => setFiltroMetodo(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">Todos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Yape">Yape</option>
          </select>
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
        ) : ventas.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No se encontraron ventas</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">N°</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha / Hora</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Cajero</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Método</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Yape Verif.</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">#{String(v.id).padStart(6, '0')}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{new Date(v.createdAt).toLocaleDateString('es-PE')}</div>
                        <div className="text-xs text-gray-400">{new Date(v.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{v.usuario?.nombre || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          v.metodo_pago === 'Yape'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {v.metodo_pago === 'Yape' ? <Smartphone className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                          {v.metodo_pago}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${v.estado === 'Anulada' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>S/. {Number(v.monto_total).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {v.metodo_pago === 'Yape' ? (
                          v.yape_verificado ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title={v.yape_verificado_en ? `Verificado: ${new Date(v.yape_verificado_en).toLocaleString('es-PE')}` : ''}>
                              <CheckCircle className="h-3.5 w-3.5" />
                              Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <XCircle className="h-3.5 w-3.5" />
                              Pendiente
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {v.estado === 'Anulada' ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700"
                            title={v.motivo_anulacion || ''}
                          >
                            <Ban className="h-3 w-3" />
                            Anulada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            Completada
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => verDetalle(v.id)}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Detalle
                          </button>
                          {puedeAnular && v.estado !== 'Anulada' && (
                            <button
                              onClick={() => setVentaAAnular(v)}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Ban className="h-3.5 w-3.5" />
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <span className="text-sm text-gray-500">
                  Mostrando {(pagination.pagina - 1) * pagination.limite + 1}–{Math.min(pagination.pagina * pagination.limite, pagination.total)} de {pagination.total} ventas
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

      {/* Modal detalle */}
      {detalleVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDetalleVenta(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Venta #{String(detalleVenta.id).padStart(6, '0')}</h2>
              <button onClick={() => setDetalleVenta(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {detalleVenta.estado === 'Anulada' && (
                <div className="rounded-lg bg-red-50 p-3 text-red-700">
                  <p className="text-xs font-semibold uppercase tracking-wide">Venta anulada</p>
                  <p className="mt-1">{detalleVenta.motivo_anulacion}</p>
                  <p className="mt-1 text-xs text-red-500">
                    Por {detalleVenta.anulado_por?.nombre || '-'}
                    {detalleVenta.anulado_en ? ` el ${new Date(detalleVenta.anulado_en).toLocaleString('es-PE')}` : ''}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
                <div>
                  <span className="text-xs text-gray-500">Fecha</span>
                  <p className="font-medium">{new Date(detalleVenta.createdAt).toLocaleDateString('es-PE')} {new Date(detalleVenta.createdAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Cajero</span>
                  <p className="font-medium">{detalleVenta.usuario?.nombre || '-'}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Método de pago</span>
                  <p className="font-medium">{detalleVenta.metodo_pago}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Monto total</span>
                  <p className="font-bold text-gray-800">S/. {Number(detalleVenta.monto_total).toFixed(2)}</p>
                </div>
                {detalleVenta.metodo_pago === 'Yape' && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Monto Yape</span>
                      <p className="font-medium">S/. {Number(detalleVenta.monto_yape || detalleVenta.monto_total).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Verificado</span>
                      <p className="flex items-center gap-1 font-medium">
                        {detalleVenta.yape_verificado ? (
                          <><CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Sí</>
                        ) : (
                          <><XCircle className="h-3.5 w-3.5 text-amber-500" /> Pendiente</>
                        )}
                      </p>
                    </div>
                    {detalleVenta.yape_verificado_en && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500">Verificado el</span>
                        <p className="font-medium">{new Date(detalleVenta.yape_verificado_en).toLocaleString('es-PE')}</p>
                      </div>
                    )}
                    {detalleVenta.referencia_pago && (
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500">N° de operación IziPay</span>
                        <p className="font-medium">{detalleVenta.referencia_pago}</p>
                      </div>
                    )}
                  </>
                )}
                {detalleVenta.metodo_pago === 'Efectivo' && (
                  <>
                    <div>
                      <span className="text-xs text-gray-500">Recibido</span>
                      <p className="font-medium">S/. {Number(detalleVenta.monto_recibido || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Vuelto</span>
                      <p className="font-medium">S/. {Number(detalleVenta.vuelto || 0).toFixed(2)}</p>
                    </div>
                  </>
                )}
              </div>

              <h3 className="font-semibold text-gray-700">Productos</h3>
              <div className="divide-y divide-gray-100">
                {(detalleVenta.detalles || []).map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-700">{d.producto?.nombre || 'Producto'}</p>
                      <p className="text-xs text-gray-400">{d.producto?.marca || ''} x{d.cantidad}</p>
                    </div>
                    <span className="font-medium text-gray-800">S/. {Number(d.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal anular venta */}
      {ventaAAnular && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => { if (!anulando) { setVentaAAnular(null); setMotivoAnular(''); } }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-lg font-bold text-gray-800">
              Anular venta #{String(ventaAAnular.id).padStart(6, '0')}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              Se repondrá el stock vendido y se ajustará el monto en la caja del turno abierto. Esta acción no se puede deshacer.
            </p>
            <label className="mb-1 block text-xs font-medium text-gray-500">Motivo de anulación</label>
            <textarea
              value={motivoAnular}
              onChange={(e) => setMotivoAnular(e.target.value)}
              rows={3}
              autoFocus
              className="mb-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="Ej: producto incorrecto, cliente se arrepintió, error de cobro..."
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setVentaAAnular(null); setMotivoAnular(''); }}
                disabled={anulando}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAnular}
                disabled={anulando}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {anulando && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar anulación
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
    </div>
  );
}
