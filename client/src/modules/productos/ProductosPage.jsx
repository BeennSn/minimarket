import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Pencil, EyeOff, Eye, X, Trash2, AlertTriangle, Loader2, Package, ScanLine, Layers } from 'lucide-react';
import api from '../../utils/axios';
import { formatMoneda, formatStock, formatFecha, fechaLocalISO } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { rolSatisface } from '../../utils/roles';
import { useStockSync } from '../../context/StockSyncContext';
import Breadcrumb from '../../components/Breadcrumb';
import Spinner from '../../components/Spinner';
import ConfirmDialog from '../../components/ConfirmDialog';
import Toast from '../../components/Toast';
import useToast from '../../hooks/useToast';

const UNIDADES_COMPRA = ['Unidad', 'Caja', 'Paquete', 'Docena', 'Otro'];

// Valores que puede traer la URL en ?alerta=... (ej. al llegar desde el
// Dashboard) mapeados al valor interno de filtroAlerta. Cualquier otro valor
// (o ausencia del parámetro) deja el filtro en su default ("Todos").
const ALERTA_POR_QUERY = {
  critico: 'Crítico',
  agotado: 'Agotado',
  stockBajo: 'Stock bajo',
  vencido: 'Vencido',
  porVencer: 'Por vencer',
};
const PRECIO_MAX = 999999.99;

// Deja solo dígitos y un único punto decimal (bloquea "e", "+", "-", letras, etc.)
// y limita a 6 dígitos enteros + 2 decimales, igual que el monto recibido en Ventas.
function sanitizarPrecio(valor) {
  let limpio = String(valor).replace(/[^0-9.]/g, '');

  const primerPunto = limpio.indexOf('.');
  if (primerPunto !== -1) {
    limpio = limpio.slice(0, primerPunto + 1) + limpio.slice(primerPunto + 1).replace(/\./g, '');
  }

  let [entero, decimal] = limpio.split('.');
  entero = (entero || '').slice(0, 6);
  if (decimal !== undefined) {
    decimal = decimal.slice(0, 2);
    limpio = `${entero}.${decimal}`;
  } else {
    limpio = entero;
  }

  return limpio;
}

function ModalProducto({ abierto, onCerrar, onGuardar, productoEditando, categorias, productos, onProductoExistente }) {
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precio, setPrecio] = useState('');
  const [stockMinimo, setStockMinimo] = useState('');
  const [unidadCompra, setUnidadCompra] = useState('Unidad');
  const [factorConversion, setFactorConversion] = useState('1');
  // Presentaciones de venta adicionales a la default "Unidad" (esa la rige
  // el campo "Precio" de arriba). Cada fila: { key, id (null si es nueva),
  // nombre, factorConversion, precio, eliminar }.
  const [presentacionesFilas, setPresentacionesFilas] = useState([]);
  const presentacionesOriginalesRef = useRef([]);
  const siguienteKeyPresentacionRef = useRef(0);
  const [manejaVencimiento, setManejaVencimiento] = useState(true);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [barcodeFocused, setBarcodeFocused] = useState(false);
  const [yaExiste, setYaExiste] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [autocompletado, setAutocompletado] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState(null);
  const inputCodigoRef = useRef(null);
  const esCreacion = !productoEditando;

  useEffect(() => {
    if (abierto) {
      if (productoEditando) {
        setNombre(productoEditando.nombre || '');
        setMarca(productoEditando.marca || '');
        setCategoriaId(productoEditando.categoria?.id ?? productoEditando.categoria_id ?? productoEditando.categoriaId ?? '');
        setPrecio(productoEditando.precio ?? '');
        setStockMinimo(productoEditando.stock_minimo ?? '');
        setUnidadCompra(productoEditando.unidad_compra || 'Unidad');
        setFactorConversion(String(productoEditando.factor_conversion ?? 1));
        setManejaVencimiento(productoEditando.maneja_vencimiento !== false);
        setCodigoBarras(productoEditando.codigo_barras ?? '');
        // La presentación default ("Unidad") la gobierna el campo Precio de
        // arriba — acá solo se editan las presentaciones adicionales activas.
        const extras = (productoEditando.presentaciones || [])
          .filter((p) => !p.es_default && p.activo)
          .map((p) => ({
            key: p.id,
            id: p.id,
            nombre: p.nombre,
            factorConversion: String(p.factor_conversion),
            precio: String(p.precio),
            eliminar: false,
          }));
        presentacionesOriginalesRef.current = extras;
        setPresentacionesFilas(extras);
      } else {
        setNombre('');
        setMarca('');
        setCategoriaId(categorias.length > 0 ? categorias[0].id : '');
        setPrecio('');
        setStockMinimo('10');
        setUnidadCompra('Unidad');
        setFactorConversion('1');
        setManejaVencimiento(true);
        setCodigoBarras('');
        presentacionesOriginalesRef.current = [];
        setPresentacionesFilas([]);
      }
      setError('');
      setBuscandoCodigo(false);
      setYaExiste(null);
      setImagenPreview(null);
      setAutocompletado(false);
      setMensajeBusqueda(null);
    }
    // categorias se usa solo para el valor por defecto al crear; no debe
    // re-disparar este efecto cuando el padre la recarga en segundo plano
    // (si no, se borraría el formulario a mitad de que el usuario lo llena).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, productoEditando]);

  if (!abierto) return null;

  const handleBuscarCodigo = async () => {
    const codigo = codigoBarras.trim();
    if (!codigo || buscandoCodigo) return;
    setBuscandoCodigo(true);
    setYaExiste(null);
    setMensajeBusqueda(null);
    try {
      const { data } = await api.get(`/productos/buscar-codigo/${encodeURIComponent(codigo)}`);
      if (data.ya_existe) {
        setYaExiste(data.producto);
      } else if (data.encontrado) {
        if (data.nombre) setNombre(data.nombre);
        if (data.marca) setMarca(data.marca);
        if (data.categoria_id_sugerido) setCategoriaId(String(data.categoria_id_sugerido));
        setImagenPreview(data.imagen_url || null);
        setAutocompletado(true);
        setMensajeBusqueda({ tipo: 'exito', texto: 'Datos completados automáticamente. Verifica antes de guardar.' });
      } else {
        setMensajeBusqueda({ tipo: 'info', texto: 'No se encontró información para este código. Completa los datos manualmente.' });
      }
    } catch {
      setMensajeBusqueda({ tipo: 'info', texto: 'No se pudo consultar el código de barras. Completa los datos manualmente.' });
    } finally {
      setBuscandoCodigo(false);
    }
  };

  const agregarFilaPresentacion = () => {
    siguienteKeyPresentacionRef.current -= 1;
    setPresentacionesFilas((prev) => [
      ...prev,
      { key: siguienteKeyPresentacionRef.current, id: null, nombre: '', factorConversion: '', precio: '', eliminar: false },
    ]);
  };

  const actualizarFilaPresentacion = (key, cambios) => {
    setPresentacionesFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFilaPresentacion = (key) => {
    setPresentacionesFilas((prev) =>
      prev
        .map((f) => (f.key === key ? { ...f, eliminar: !f.eliminar } : f))
        .filter((f) => !(f.key === key && f.id === null && f.eliminar))
    );
  };

  // Crea/actualiza/desactiva las presentaciones adicionales contra el
  // backend, diffeando cada fila contra el snapshot cargado al abrir el
  // modal (presentacionesOriginalesRef). La presentación default "Unidad"
  // no se toca acá: la maneja el campo Precio vía el payload del producto.
  const guardarPresentaciones = async (productoId) => {
    const originales = presentacionesOriginalesRef.current;
    for (const fila of presentacionesFilas) {
      if (fila.id) {
        if (fila.eliminar) {
          await api.patch(`/productos/${productoId}/presentaciones/${fila.id}/desactivar`);
          continue;
        }
        const original = originales.find((o) => o.id === fila.id);
        const cambio = !original ||
          original.nombre !== fila.nombre.trim() ||
          original.factorConversion !== fila.factorConversion ||
          original.precio !== fila.precio;
        if (cambio) {
          await api.put(`/productos/${productoId}/presentaciones/${fila.id}`, {
            nombre: fila.nombre.trim(),
            factor_conversion: parseInt(fila.factorConversion, 10) || 1,
            precio: parseFloat(fila.precio),
          });
        }
      } else if (!fila.eliminar) {
        await api.post(`/productos/${productoId}/presentaciones`, {
          nombre: fila.nombre.trim(),
          factor_conversion: parseInt(fila.factorConversion, 10) || 1,
          precio: parseFloat(fila.precio),
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const nombreLimpio = nombre.trim();
    const marcaLimpia = marca.trim();
    // Chequeo local antes de golpear al backend (mismo criterio: sin
    // mayúsculas/espacios) para feedback instantáneo, igual que ya hacen
    // Categorías y Proveedores.
    const duplicado = productos?.some(
      (p) =>
        p.id !== productoEditando?.id &&
        p.nombre.trim().toLowerCase() === nombreLimpio.toLowerCase() &&
        p.marca.trim().toLowerCase() === marcaLimpia.toLowerCase()
    );
    if (duplicado) {
      setError('Ya existe un producto con ese nombre y marca');
      return;
    }

    const filasPresentacionesActivas = presentacionesFilas.filter((f) => !f.eliminar);
    for (const fila of filasPresentacionesActivas) {
      const nombreFila = fila.nombre.trim();
      if (!nombreFila) {
        setError('Cada presentación adicional necesita un nombre');
        return;
      }
      if (nombreFila.toLowerCase() === 'unidad') {
        setError('"Unidad" ya es la presentación default (el campo Precio de arriba); usa otro nombre para las adicionales');
        return;
      }
      if (!fila.factorConversion || parseInt(fila.factorConversion, 10) < 1) {
        setError(`El factor de conversión de "${nombreFila}" debe ser al menos 1`);
        return;
      }
      if (!fila.precio || parseFloat(fila.precio) <= 0) {
        setError(`El precio de "${nombreFila}" debe ser mayor a 0`);
        return;
      }
    }
    const nombresRepetidos = filasPresentacionesActivas.some((fila, idx) =>
      filasPresentacionesActivas.some((otra, otroIdx) => otroIdx !== idx && otra.nombre.trim().toLowerCase() === fila.nombre.trim().toLowerCase())
    );
    if (nombresRepetidos) {
      setError('Hay presentaciones adicionales con el mismo nombre');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre: nombreLimpio, marca: marcaLimpia, categoria_id: categoriaId, precio: parseFloat(precio), codigo_barras: codigoBarras || null,
        stock_minimo: stockMinimo !== '' ? parseInt(stockMinimo, 10) : null,
        unidad_compra: unidadCompra,
        factor_conversion: factorConversion !== '' ? parseInt(factorConversion, 10) : 1,
        maneja_vencimiento: manejaVencimiento,
      };

      if (esCreacion) {
        const { data } = await api.post('/productos', payload);
        await guardarPresentaciones(data.id);
      } else {
        await api.put(`/productos/${productoEditando.id}`, payload);
        await guardarPresentaciones(productoEditando.id);
      }
      onGuardar();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <h2 className="text-lg font-bold text-gray-800">
            {esCreacion ? 'Nuevo Producto' : 'Editar Producto'}
          </h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="space-y-4 overflow-y-auto p-6">
          {esCreacion ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código de Barras</label>
              <div className="relative">
                <ScanLine className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${barcodeFocused ? 'text-green-500' : 'text-gray-400'}`} />
                <input
                  ref={inputCodigoRef}
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleBuscarCodigo())}
                  onFocus={() => setBarcodeFocused(true)}
                  onBlur={() => setBarcodeFocused(false)}
                  placeholder={barcodeFocused ? 'Escanea o escribe el código...' : 'Haz clic aquí para escanear'}
                  autoFocus
                  className={`w-full rounded-lg border-2 px-4 py-2 pl-10 pr-32 focus:outline-none focus:ring-2 transition-colors ${
                    barcodeFocused ? 'border-green-400 focus:ring-green-100' : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-100'
                  }`}
                />
                {buscandoCodigo ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />
                ) : barcodeFocused && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-green-600 pointer-events-none">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    Listo para escanear
                  </span>
                )}
              </div>
              {imagenPreview && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={imagenPreview} alt="Vista previa" className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
                  <span className="text-xs text-gray-400">Vista previa (no se guarda)</span>
                </div>
              )}
              {mensajeBusqueda && (
                <p className={`mt-1 text-xs ${mensajeBusqueda.tipo === 'exito' ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {mensajeBusqueda.texto}
                </p>
              )}
              {yaExiste && (
                <div className="mt-2 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="text-amber-800">
                    Este producto ya está registrado: <span className="font-medium">{yaExiste.nombre} - {yaExiste.marca}</span> (Stock: {yaExiste.stock})
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onProductoExistente?.(yaExiste)}
                      className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                    >
                      Editar producto existente
                    </button>
                    <button
                      type="button"
                      onClick={() => { setYaExiste(null); setCodigoBarras(''); inputCodigoRef.current?.focus(); }}
                      className="rounded-lg border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                    >
                      Escanear otro código
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Código de Barras</label>
              <input
                type="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setAutocompletado(false); }}
              required
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                autocompletado ? 'border-l-4 border-l-emerald-400 border-gray-200' : 'border-gray-200'
              }`}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Marca</label>
            <input
              type="text"
              value={marca}
              onChange={(e) => { setMarca(e.target.value); setAutocompletado(false); }}
              required
              className={`w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                autocompletado ? 'border-l-4 border-l-emerald-400 border-gray-200' : 'border-gray-200'
              }`}
            />
            {autocompletado && (
              <p className="mt-1 text-xs text-emerald-600">Verifica que estos datos sean correctos</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoría</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Precio</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">S./</span>
              <input
                type="text"
                inputMode="decimal"
                value={precio}
                onChange={(e) => setPrecio(sanitizarPrecio(e.target.value))}
                onKeyDown={(e) => {
                  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const texto = e.clipboardData.getData('text');
                  setPrecio((prev) => sanitizarPrecio(prev + texto));
                }}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Unidad de Compra</label>
            <select
              value={unidadCompra}
              onChange={(e) => setUnidadCompra(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {UNIDADES_COMPRA.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {unidadCompra !== 'Unidad' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Factor de Conversión</label>
              <input
                type="number"
                min="1"
                value={factorConversion}
                onChange={(e) => setFactorConversion(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="mt-1 text-xs text-gray-400">¿Cuántas unidades de venta trae 1 {unidadCompra.toLowerCase()}?</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Presentaciones de venta adicionales
                <span className="ml-1 text-xs font-normal text-gray-400">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={agregarFilaPresentacion}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar
              </button>
            </div>
            <p className="mt-1 mb-2 text-xs text-gray-400">
              Además de "Unidad" (el precio de arriba), define otras formas de vender este producto —
              ej. "Media docena", "Docena", "Paquete" — cada una con su propio precio.
            </p>
            {presentacionesFilas.length === 0 ? (
              <p className="text-xs italic text-gray-400">Sin presentaciones adicionales: este producto solo se vende por Unidad.</p>
            ) : (
              <div className="space-y-2">
                {presentacionesFilas.map((fila) => (
                  <div
                    key={fila.key}
                    className={`grid grid-cols-[1fr_4.5rem_6rem_auto] items-center gap-2 rounded-lg border p-2 ${
                      fila.eliminar ? 'border-red-100 bg-red-50 opacity-60' : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="text"
                      placeholder="Nombre (ej. Docena)"
                      value={fila.nombre}
                      disabled={fila.eliminar}
                      onChange={(e) => actualizarFilaPresentacion(fila.key, { nombre: e.target.value })}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Factor"
                      value={fila.factorConversion}
                      disabled={fila.eliminar}
                      onChange={(e) => actualizarFilaPresentacion(fila.key, { factorConversion: e.target.value })}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">S./</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Precio"
                        value={fila.precio}
                        disabled={fila.eliminar}
                        onChange={(e) => actualizarFilaPresentacion(fila.key, { precio: sanitizarPrecio(e.target.value) })}
                        className="w-full rounded-md border border-gray-200 py-1.5 pl-7 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarFilaPresentacion(fila.key)}
                      className="text-xs font-medium text-red-500 hover:text-red-600"
                    >
                      {fila.eliminar ? 'Deshacer' : 'Quitar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                id="maneja_vencimiento"
                type="checkbox"
                checked={manejaVencimiento}
                onChange={(e) => setManejaVencimiento(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <label htmlFor="maneja_vencimiento" className="text-sm font-medium text-gray-700">
                Este producto maneja fecha de vencimiento
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Desmárcalo para productos que no caducan (Encendedor, cepillos, productos no perecederos, etc.): sus entradas de inventario no pedirán fecha de vencimiento.
            </p>
          </div>

        {esCreacion && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-700">
            El producto se crea con <b>stock 0</b>. Para registrar el primer lote (cantidad,
            proveedor, fecha de vencimiento), ve a <b>Inventario → Entradas</b> después de guardar.
          </div>
        )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Stock Mínimo {!esCreacion && <span className="text-gray-400 text-xs">(opcional)</span>}
            </label>
            <input
              type="number"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              disabled={esCreacion}
              placeholder="Umbral global si se deja vacío"
              className="w-full rounded-lg border border-gray-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">
              {esCreacion
                ? 'Valor preestablecido (10). Se puede ajustar más adelante editando el producto.'
                : 'Punto de reorden propio de este producto para el reporte de Stock Crítico.'}
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>
          )}
        </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 p-6 pt-4">
            <button
              type="button"
              onClick={onCerrar}
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600 disabled:opacity-70"
            >
              {loading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Muestra los lotes (EntradaMercaderia) de un producto uno por uno —
// cantidad restante, vencimiento y estado — para que se pueda verificar a
// simple vista qué hay detrás del stock total y evitar confusiones cuando
// coexisten lotes vencidos y vigentes del mismo producto.
function ModalLotes({ abierto, onCerrar, producto }) {
  const [lotes, setLotes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && producto) {
      setCargando(true);
      setError('');
      api.get('/inventario/entradas', { params: { producto_id: producto.id } })
        .then(({ data }) => setLotes(Array.isArray(data) ? data : []))
        .catch(() => setError('Error al cargar los lotes de este producto'))
        .finally(() => setCargando(false));
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const hoy = fechaLocalISO(new Date());

  const estadoLote = (l) => {
    if (l.cantidad_restante === 0) return { texto: 'Agotado', clase: 'bg-gray-100 text-gray-500' };
    if (!l.fecha_vencimiento) return { texto: 'Sin vencimiento', clase: 'bg-gray-100 text-gray-600' };
    if (l.fecha_vencimiento <= hoy) return { texto: 'Vencido', clase: 'bg-red-100 text-red-700' };
    return { texto: 'Vigente', clase: 'bg-green-100 text-green-700' };
  };

  // Mismo orden que usa el sistema al vender (FEFO): vencimiento más próximo
  // primero, sin vencimiento al final, y los agotados siempre al fondo.
  const lotesOrdenados = [...lotes].sort((a, b) => {
    if ((a.cantidad_restante === 0) !== (b.cantidad_restante === 0)) {
      return a.cantidad_restante === 0 ? 1 : -1;
    }
    const fa = a.fecha_vencimiento || '9999-99-99';
    const fb = b.fecha_vencimiento || '9999-99-99';
    if (fa !== fb) return fa < fb ? -1 : 1;
    return new Date(a.createdAt) - new Date(b.createdAt);
  });

  const totalRestante = lotes.reduce((s, l) => s + l.cantidad_restante, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Lotes de {producto.nombre}</h2>
            <p className="text-xs text-gray-400">{producto.marca}</p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {cargando ? (
            <Spinner texto="Cargando lotes..." />
          ) : error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : lotes.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">
              Este producto no tiene entradas de inventario registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase text-gray-400">
                    <th className="px-3 py-2 font-medium">Lote</th>
                    <th className="px-3 py-2 font-medium">Vencimiento</th>
                    <th className="px-3 py-2 font-medium">Restante</th>
                    <th className="px-3 py-2 font-medium">Original</th>
                    <th className="px-3 py-2 font-medium">Proveedor</th>
                    <th className="px-3 py-2 font-medium">Ingreso</th>
                    <th className="px-3 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {lotesOrdenados.map((l) => {
                    const est = estadoLote(l);
                    return (
                      <tr
                        key={l.id}
                        className={`border-t border-gray-50 ${l.cantidad_restante === 0 ? 'text-gray-300' : 'text-gray-700'}`}
                      >
                        <td className="px-3 py-2">{l.codigo_lote || '—'}</td>
                        <td className="px-3 py-2">{l.fecha_vencimiento ? formatFecha(l.fecha_vencimiento) : '—'}</td>
                        <td className="px-3 py-2 font-medium">{l.cantidad_restante}</td>
                        <td className="px-3 py-2 text-gray-400">{l.cantidad}</td>
                        <td className="px-3 py-2">{l.proveedor?.nombre || '—'}</td>
                        <td className="px-3 py-2">{formatFecha(l.createdAt)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${est.clase}`}>
                            {est.texto}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-right text-xs text-gray-400">
                Suma de restantes: <span className="font-semibold text-gray-600">{totalRestante}</span> — el orden de la tabla es el que usa el sistema al vender (FEFO)
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-100 p-6 pt-4">
          <button
            onClick={onCerrar}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSolicitud({ abierto, onCerrar, producto, proveedores, onCreada }) {
  const [cantidad, setCantidad] = useState('');
  const [proveedorId, setProveedorId] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && producto) {
      setCantidad('');
      setProveedorId(producto.proveedor?.id ?? '');
      setError('');
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/solicitudes', {
        producto_id: producto.id,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCerrar}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Solicitar Reposición</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {producto.nombre} - {producto.marca}</p>
          <p><span className="font-medium text-gray-700">Stock actual:</span> {producto.stock} und(s)</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad a solicitar</label>
            <input
              type="number" min="1" value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
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

const MOTIVOS_BAJA = ['Vencido', 'Dañado', 'Robo o faltante', 'Consumo interno', 'Otro'];

function ModalBaja({ abierto, onCerrar, producto, onRegistrada }) {
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('Vencido');
  const [motivoDetalle, setMotivoDetalle] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (abierto && producto) {
      setCantidad('1');
      setMotivo('Vencido');
      setMotivoDetalle('');
      setError('');
    }
  }, [abierto, producto]);

  if (!abierto || !producto) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const c = parseInt(cantidad, 10);
    if (!c || c <= 0) { setError('La cantidad debe ser mayor a 0'); return; }
    if (c > (producto.stock || 0)) { setError(`Stock insuficiente (disponible: ${producto.stock})`); return; }
    setEnviando(true);
    setError('');
    try {
      await api.post('/inventario/bajas', {
        producto_id: producto.id,
        cantidad: c,
        motivo,
        motivo_detalle: motivoDetalle || null,
      });
      onRegistrada();
    } catch (err) {
      setError(err.response?.data?.mensaje || 'Error al registrar baja');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Dar de Baja</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          <p><span className="font-medium text-gray-700">Producto:</span> {producto.nombre}</p>
          <p><span className="font-medium text-gray-700">Stock actual:</span> {producto.stock} und(s)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Cantidad</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {producto.stock > 0 && (
                <button
                  type="button"
                  onClick={() => setCantidad(String(producto.stock))}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Todo
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {MOTIVOS_BAJA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Detalle <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivoDetalle}
              onChange={(e) => setMotivoDetalle(e.target.value)}
              placeholder="Ej: Lote vencido el 15/06"
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
              className="flex items-center gap-2 rounded-lg bg-[#ef4444] px-4 py-2 text-sm text-white transition-colors hover:bg-red-600 disabled:opacity-70"
            >
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Baja
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductosPage() {
  const { usuario } = useAuth();
  const { toast, mostrarExito, mostrarError, cerrar } = useToast();
  const { stockVersion, notificarCambioStock } = useStockSync();
  const [searchParams, setSearchParams] = useSearchParams();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  // Se leen una sola vez al entrar (ej. llegando desde el Dashboard con
  // ?alerta=stockBajo&buscar=Coca+Cola): el inicializador de useState solo
  // corre en el primer render, así que cambios posteriores del usuario en
  // estos filtros nunca vuelven a competir con la URL.
  const [busqueda, setBusqueda] = useState(() => searchParams.get('buscar') || '');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [confirmarEstado, setConfirmarEstado] = useState(null);
  const [modalBaja, setModalBaja] = useState(null);
  const [modalSolicitud, setModalSolicitud] = useState(null);
  const [modalLotes, setModalLotes] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [datosVencimiento, setDatosVencimiento] = useState([]);
  const [filtroAlerta, setFiltroAlerta] = useState(
    () => ALERTA_POR_QUERY[searchParams.get('alerta')] || 'Todos'
  );
  const [paginaActual, setPaginaActual] = useState(1);

  // Una vez consumidos, se limpian de la URL — así un refresh posterior no
  // vuelve a forzar el mismo filtro si el usuario ya lo cambió a mano.
  useEffect(() => {
    if (searchParams.toString()) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ITEMS_POR_PAGINA = 12;
  const rol = usuario?.rol;
  const puedeDarBaja = rolSatisface(rol, ['Almacenero', 'Administrador']);

  const cargarDatos = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError('');
    try {
      const [resProductos, resCategorias, resVenc, resProv] = await Promise.all([
        api.get('/productos'),
        api.get('/categorias'),
        api.get('/productos/vencer?dias=30').catch(() => ({ data: [] })),
        api.get('/proveedores?soloActivos=true').catch(() => ({ data: [] })),
      ]);
      setProductos(Array.isArray(resProductos.data) ? resProductos.data : []);
      setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
      setDatosVencimiento(Array.isArray(resVenc.data) ? resVenc.data : []);
      setProveedores(Array.isArray(resProv.data) ? resProv.data : []);
    } catch (err) {
      if (!silencioso) setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const primeraCargaRef = useRef(true);
  useEffect(() => {
    cargarDatos(!primeraCargaRef.current);
    primeraCargaRef.current = false;
  }, [stockVersion]);

  const abrirCrear = () => { setProductoEditando(null); setModalAbierto(true); };
  const abrirEditar = (p) => { setProductoEditando(p); setModalAbierto(true); };

  const handleGuardar = () => {
    setModalAbierto(false);
    setProductoEditando(null);
    cargarDatos();
  };

  const esActivo = (p) => p.activo === true || p.activo == null;

  const toggleEstado = async () => {
    if (!confirmarEstado) return;
    const p = confirmarEstado;
    const activo = esActivo(p);
    const accion = activo ? 'desactivar' : 'reactivar';
    setConfirmarEstado(null);
    try {
      await api.patch(`/productos/${p.id}/${accion}`);
      mostrarExito(`Producto ${accion}do correctamente`);
      cargarDatos();
    } catch (err) {
      mostrarError(err.response?.data?.mensaje || `Error al ${accion} producto`);
    }
  };

  // Mismo umbral por producto que usa el Dashboard (stock_minimo propio, o 5
  // si no tiene uno definido) — antes acá se usaba un "≤5" fijo para todos,
  // que no coincidía con el "Stock crítico" del Dashboard para productos con
  // su propio stock_minimo, y rompía la navegación entre ambas pantallas.
  const umbralStockBajo = (p) => p.stock_minimo ?? 5;
  const esAgotado = (p) => esActivo(p) && p.stock === 0;
  const esStockBajo = (p) => esActivo(p) && p.stock > 0 && p.stock <= umbralStockBajo(p);

  const conteoAlertas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);

    const idsVencEntrada = new Set(datosVencimiento.filter((d) => d.stock_vencido > 0).map((d) => d.id));
    const idsPorVencerEntrada = new Set(datosVencimiento.filter((d) => d.stock_por_vencer > 0).map((d) => d.id));

    const idsVencProducto = new Set();
    const idsPorVencerProducto = new Set();
    for (const p of productos) {
      if (!p.proxima_fecha_vencimiento) continue;
      const fv = new Date(p.proxima_fecha_vencimiento + 'T00:00:00');
      if (fv < hoy) idsVencProducto.add(p.id);
      else if (fv <= limite) idsPorVencerProducto.add(p.id);
    }

    const agotado = productos.filter(esAgotado).length;
    const stockBajo = productos.filter(esStockBajo).length;
    const idsVencidos = new Set([...idsVencEntrada, ...idsVencProducto]);
    const idsPorVencer = new Set([...idsPorVencerEntrada, ...idsPorVencerProducto]);
    return { agotado, stockBajo, idsVencidos, idsPorVencer };
  }, [productos, datosVencimiento]);

  const filtrados = productos.filter((p) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + 30);
    const fvProd = p.proxima_fecha_vencimiento ? new Date(p.proxima_fecha_vencimiento + 'T00:00:00') : null;

    const coincideTexto =
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.marca?.toLowerCase().includes(busqueda.toLowerCase());
    const prodCategoriaId = p.categoria?.id ?? p.categoria_id;
    const coincideCategoria =
      filtroCategoria === 'Todas' || String(prodCategoriaId) === String(filtroCategoria);
    const coincideEstado =
      filtroEstado === 'Todos' ||
      (filtroEstado === 'Activo' && esActivo(p)) ||
      (filtroEstado === 'Inactivo' && !esActivo(p));
    const coincideAlerta =
      filtroAlerta === 'Todos' ||
      (filtroAlerta === 'Crítico' && (esAgotado(p) || esStockBajo(p))) ||
      (filtroAlerta === 'Agotado' && esAgotado(p)) ||
      (filtroAlerta === 'Stock bajo' && esStockBajo(p)) ||
      (filtroAlerta === 'Vencido' && (conteoAlertas.idsVencidos.has(p.id) || (fvProd && fvProd < hoy))) ||
      (filtroAlerta === 'Por vencer' && (conteoAlertas.idsPorVencer.has(p.id) || (fvProd && fvProd >= hoy && fvProd <= limite)));
    return coincideTexto && coincideCategoria && coincideEstado && coincideAlerta;
  });

  useEffect(() => { setPaginaActual(1); }, [busqueda, filtroCategoria, filtroEstado, filtroAlerta]);

  const totalPaginas = Math.ceil(filtrados.length / ITEMS_POR_PAGINA);
  const productosPagina = filtrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  const stockColor = (stock) => {
    if (stock === 0) return 'bg-red-50';
    if (stock <= 5) return 'bg-amber-50';
    return '';
  };

  return (
    <div className="space-y-6">
      <Toast mensaje={toast.mensaje} tipo={toast.tipo} visible={toast.visible} onCerrar={cerrar} />
      <Breadcrumb items={[{ label: 'Inicio', path: '/dashboard' }, { label: 'Productos' }]} />

      {(conteoAlertas.agotado > 0 || conteoAlertas.stockBajo > 0 || conteoAlertas.idsVencidos.size > 0 || conteoAlertas.idsPorVencer.size > 0) && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          {conteoAlertas.agotado > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Agotado' ? 'Todos' : 'Agotado')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Agotado'
                  ? 'bg-red-200 text-red-900'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.agotado} producto{conteoAlertas.agotado !== 1 ? 's' : ''} agotado{conteoAlertas.agotado !== 1 ? 's' : ''}
            </button>
          )}
          {conteoAlertas.stockBajo > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Stock bajo' ? 'Todos' : 'Stock bajo')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Stock bajo'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.stockBajo} producto{conteoAlertas.stockBajo !== 1 ? 's' : ''} con stock bajo
            </button>
          )}
          {conteoAlertas.idsVencidos.size > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Vencido' ? 'Todos' : 'Vencido')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Vencido'
                  ? 'bg-red-200 text-red-900'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.idsVencidos.size} producto{conteoAlertas.idsVencidos.size !== 1 ? 's' : ''} vencido{conteoAlertas.idsVencidos.size !== 1 ? 's' : ''}
            </button>
          )}
          {conteoAlertas.idsPorVencer.size > 0 && (
            <button
              onClick={() => setFiltroAlerta(filtroAlerta === 'Por vencer' ? 'Todos' : 'Por vencer')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroAlerta === 'Por vencer'
                  ? 'bg-yellow-200 text-yellow-900'
                  : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              {conteoAlertas.idsPorVencer.size} producto{conteoAlertas.idsPorVencer.size !== 1 ? 's' : ''} por vencer
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white transition-colors hover:bg-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Nuevo Producto
        </button>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o marca..."
            className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todas">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Todos los estados</option>
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
        </select>

        <select
          value={filtroAlerta}
          onChange={(e) => setFiltroAlerta(e.target.value)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="Todos">Sin filtro</option>
          <option value="Crítico">Crítico (agotado + bajo)</option>
          <option value="Agotado">Agotado (sin stock)</option>
          <option value="Stock bajo">Stock bajo</option>
          <option value="Vencido">Vencido</option>
          <option value="Por vencer">Por vencer</option>
        </select>
      </div>

      {loading ? (
        <Spinner texto="Cargando productos..." />
      ) : error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      ) : filtrados.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No hay productos registrados
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-[#6366f1] text-white">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Marca</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Precio</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Stock Mín.</th>
                  <th className="px-4 py-3 font-medium">Unidad Compra</th>
                  <th className="px-4 py-3 font-medium">Vencimiento</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosPagina.map((p, i) => (
                  <tr key={p.id} className={`${stockColor(p.stock)} ${i % 2 === 0 ? 'bg-white' : ''}`}>
                    <td className="px-4 py-3 text-gray-800">{p.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{p.marca}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.categoria?.nombre || categorias.find((c) => String(c.id) === String(p.categoria?.id))?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{formatMoneda(p.precio)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatStock(p.stock)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.stock_minimo != null ? p.stock_minimo : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.unidad_compra && p.unidad_compra !== 'Unidad'
                        ? `${p.unidad_compra} (x${p.factor_conversion})`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.proxima_fecha_vencimiento ? formatFecha(p.proxima_fecha_vencimiento) : '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          esActivo(p)
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {esActivo(p) ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirEditar(p)}
                          className="rounded-lg p-1.5 text-[#6366f1] transition-colors hover:bg-indigo-50"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setModalLotes(p)}
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100"
                          title="Ver lotes"
                        >
                          <Layers className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmarEstado(p)}
                          className={`rounded-lg p-1.5 transition-colors ${
                            esActivo(p)
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={esActivo(p) ? 'Desactivar' : 'Reactivar'}
                        >
                          {esActivo(p) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        {puedeDarBaja && (
                          <button
                            onClick={() => setModalBaja(p)}
                            className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                            title="Dar de baja"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {esActivo(p) && p.stock <= 5 && (
                          <button
                            onClick={() => setModalSolicitud(p)}
                            className="rounded-lg p-1.5 text-amber-600 transition-colors hover:bg-amber-50"
                            title="Solicitar reposición"
                          >
                            <Package className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-100 border border-red-200" />
                Sin stock
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-amber-100 border border-amber-200" />
                Stock crítico (&le;5)
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-sm bg-white border border-gray-300" />
                Stock normal
              </div>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 text-gray-500">
                  Pág. {paginaActual} de {totalPaginas}
                </span>
                <button
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <ModalProducto
        abierto={modalAbierto}
        onCerrar={() => { setModalAbierto(false); setProductoEditando(null); }}
        onGuardar={handleGuardar}
        productoEditando={productoEditando}
        categorias={categorias}
        productos={productos}
        onProductoExistente={abrirEditar}
      />

      <ModalBaja
        abierto={!!modalBaja}
        onCerrar={() => setModalBaja(null)}
        producto={modalBaja}
        onRegistrada={() => {
          setModalBaja(null);
          mostrarExito('Baja registrada correctamente');
          cargarDatos();
          notificarCambioStock();
        }}
      />

      <ModalLotes
        abierto={!!modalLotes}
        onCerrar={() => setModalLotes(null)}
        producto={modalLotes}
      />

      <ModalSolicitud
        abierto={!!modalSolicitud}
        onCerrar={() => setModalSolicitud(null)}
        producto={modalSolicitud}
        proveedores={proveedores}
        onCreada={() => {
          setModalSolicitud(null);
          mostrarExito('Solicitud de reposición creada');
          cargarDatos();
        }}
      />

      <ConfirmDialog
        abierto={!!confirmarEstado}
        titulo={confirmarEstado ? `${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} producto` : ''}
        mensaje={confirmarEstado ? `¿${esActivo(confirmarEstado) ? 'Desactivar' : 'Reactivar'} producto "${confirmarEstado.nombre}"?` : ''}
        onConfirmar={toggleEstado}
        onCancelar={() => setConfirmarEstado(null)}
        colorConfirmar={confirmarEstado && esActivo(confirmarEstado) ? '#ef4444' : '#10b981'}
      />
    </div>
  );
}
