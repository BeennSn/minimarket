import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, User, X, Trash2, Minus, Plus, Banknote,
  CheckCircle, Loader2, ShoppingCart, ChevronLeft, ChevronRight,
  ScanLine, ChevronDown, ChevronUp, FileText, QrCode, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStockSync } from '../../context/StockSyncContext';
import { useConfiguracion } from '../../hooks/useConfiguracion';
import api from '../../utils/axios';
import { generarComprobantePDF, construirNumeroComprobante } from '../../utils/comprobante';
import { calcularMontosCaja } from '../../utils/caja';

const ITEMS_PER_PAGE = 25;
const MONTO_RECIBIDO_MAX = 999999.99;

// Deja solo dígitos y un único punto decimal (bloquea "e", "+", "-", letras, etc.)
// y limita a 6 dígitos enteros + 2 decimales, para blindar el input desde el origen.
function sanitizarMontoRecibido(valor) {
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

// Convierte el string del input a un número acotado a [0, MONTO_RECIBIDO_MAX],
// para que ningún cálculo (vuelto, envío al backend) pueda arrastrar un valor
// absurdo o en notación científica.
function parsearMontoRecibido(valor) {
  const num = parseFloat(valor);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(num, MONTO_RECIBIDO_MAX);
}

function ModalComprobante({ venta, empresa, pdfError, onCerrar, onDescargarPDF }) {
  const esFactura = venta?.tipo_comprobante === 'Factura';
  const numero = construirNumeroComprobante(venta, empresa);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-3 text-lg font-bold text-gray-800">¡Venta realizada!</h2>
          <p className="mt-1 text-sm text-gray-400">{esFactura ? 'Factura' : 'Boleta'} {numero}</p>
        </div>

        <div className="space-y-2">
          {(venta?.detalles || venta?.items || []).map((item, i) => (
            <div key={item.id ?? i} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {item.producto?.nombre || item.nombre} x{item.cantidad}
              </span>
              <span className="text-gray-800 font-medium">
                S/. {Number(item.subtotal || 0).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <hr className="my-3 border-gray-100" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="text-lg font-bold text-gray-800">
            S/. {Number(venta?.monto_total || venta?.total || 0).toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            esFactura
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {esFactura ? 'Factura' : venta.cliente_dni ? 'Boleta con DNI' : 'Boleta Simple'}
          </span>
          {venta.cliente_dni && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">DNI: {venta.cliente_dni}</span>
          )}
          {venta.cliente_ruc && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">RUC: {venta.cliente_ruc}</span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            venta.metodo_pago === 'Yape'
              ? 'bg-purple-100 text-purple-700'
              : 'bg-green-100 text-green-700'
          }`}>
            {venta.metodo_pago}
          </span>
        </div>
        {(venta.cliente_razon_social || venta.cliente_direccion) && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            {venta.cliente_razon_social && <p>{venta.cliente_razon_social}</p>}
            {venta.cliente_direccion && <p>{venta.cliente_direccion}</p>}
          </div>
        )}

        {venta?.monto_recibido > 0 && (
          <p className="text-sm text-gray-500 text-center">
            Monto recibido: S/. {Number(venta?.monto_recibido).toFixed(2)}
            {' '}— Vuelto: S/. {Number(venta?.vuelto || 0).toFixed(2)}
          </p>
        )}

        {venta?.yape_verificado && (
          <p className="text-center text-xs text-emerald-600">
            <CheckCircle className="mr-1 inline h-3 w-3" />
            Yape verificado — S/. {Number(venta?.monto_total || 0).toFixed(2)}
            {venta?.referencia_pago && ` — N° operación: ${venta.referencia_pago}`}
          </p>
        )}

        {pdfError && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
            {pdfError}
          </p>
        )}

        <button
          onClick={onDescargarPDF}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <FileText className="h-4 w-4" />
          {esFactura ? 'Descargar Factura PDF' : 'Descargar Boleta PDF'}
        </button>

        <button
          onClick={onCerrar}
          className="mt-2 w-full rounded-lg bg-[#6366f1] py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
        >
          Nueva Venta
        </button>
      </div>
    </div>
  );
}

export default function VentasPage() {
  const { usuario } = useAuth();
  const { stockVersion, notificarCambioStock } = useStockSync();
  const { empresa, igv } = useConfiguracion();
  const esSoloLectura = usuario?.rol === 'Gerente';
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [yapeVerificado, setYapeVerificado] = useState(false);

  // Cobro Yape/Plin vía IziPay (POS físico, manual)
  const [pasoYape, setPasoYape] = useState('inicio'); // inicio|mostrando
  const [referenciaPago, setReferenciaPago] = useState('');

  // Tipo de comprobante
  const [tipoComprobante, setTipoComprobante] = useState('BoletaSimple');
  const [clienteDni, setClienteDni] = useState('');
  const [clienteRuc, setClienteRuc] = useState('');
  const [clienteRazonSocial, setClienteRazonSocial] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalComprobante, setModalComprobante] = useState(false);
  const [ventaExitosa, setVentaExitosa] = useState(null);
  const [pdfError, setPdfError] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [barcodeFocused, setBarcodeFocused] = useState(false);
  const inputCodigoRef = useRef(null);
  const buscarRef = useRef(null);

  const [buscandoDni, setBuscandoDni] = useState(false);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [nombreDni, setNombreDni] = useState('');
  const [dniValidado, setDniValidado] = useState(false);
  const [rucValidado, setRucValidado] = useState(false);
  const [rucInfo, setRucInfo] = useState(null);
  const [clienteId, setClienteId] = useState(null);
  // true cuando el DNI ya estaba registrado con un nombre distinto al que
  // acaba de devolver RENIEC — no bloquea la venta, solo avisa (podría ser un
  // DNI mal tecleado que coincide con el de otra persona ya registrada).
  const [clienteNombreNoCoincide, setClienteNombreNoCoincide] = useState(false);

  // undefined = todavía cargando, null = no tiene turno abierto, objeto = turno activo.
  // Esto es solo una guía de UX (deshabilitar el botón, mostrar el aviso antes de
  // intentar vender); la validación real e infranqueable vive en el backend
  // (venta.controller.js), así que aunque este estado quede desactualizado la
  // venta jamás se procesa sin turno.
  const [turnoActivo, setTurnoActivo] = useState(undefined);

  const cargarProductos = () => {
    api.get('/productos/activos').then(({ data }) => {
      setProductos(Array.isArray(data) ? data : []);
    }).catch((err) => {
      setError(err.response?.data?.mensaje || 'Error al cargar productos');
    });
  };

  const cargarTurno = () => {
    if (esSoloLectura) return;
    api.get('/caja/activo').then(({ data }) => {
      setTurnoActivo(data);
    }).catch(() => {
      // Si falla la consulta no bloqueamos la UI por esto solo: el backend
      // igual va a rechazar la venta si de verdad no hay turno abierto.
      setTurnoActivo(null);
    });
  };

  useEffect(() => { cargarProductos(); }, [stockVersion]);
  useEffect(() => { cargarTurno(); }, [esSoloLectura]);

  // Mantiene buscarRef siempre actualizado para usarlo desde el scanner sin closures stale
  useEffect(() => { buscarRef.current = buscarPorCodigo; });

  // Devuelve el foco al campo de barras cuando el usuario hace clic fuera de un input
  useEffect(() => {
    if (esSoloLectura) return;
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setTimeout(() => {
        const active = document.activeElement;
        const activeTag = active?.tagName;
        if (!active || (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT')) {
          inputCodigoRef.current?.focus();
        }
      }, 120);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [esSoloLectura]);

  const buscarPorCodigo = async (codigoParam = null) => {
    const codigo = (codigoParam !== null ? codigoParam : codigoBarras).trim();
    if (!codigo) return;
    setBuscandoCodigo(true);
    setError('');
    try {
      const { data } = await api.get(`/productos/codigo/${encodeURIComponent(codigo)}`);
      if (data.activo === false) {
        setError('El producto está desactivado');
      } else {
        agregarAlCarrito(data);
        setCodigoBarras('');
        inputCodigoRef.current?.focus();
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Código de barras no registrado');
      } else {
        setError(err.response?.data?.mensaje || 'Error al buscar producto');
      }
    } finally {
      setBuscandoCodigo(false);
      inputCodigoRef.current?.focus();
    }
  };

  const categorias = useMemo(() => {
    const cats = new Map();
    productos.forEach((p) => {
      if (p.categoria) cats.set(p.categoria.id, p.categoria.nombre);
    });
    return Array.from(cats, ([id, nombre]) => ({ id, nombre }));
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    let filtrados = productos;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      filtrados = filtrados.filter(
        (p) =>
          p.nombre?.toLowerCase().includes(q) ||
          p.marca?.toLowerCase().includes(q)
      );
    }
    if (categoriaFiltro) {
      filtrados = filtrados.filter(
        (p) => p.categoria?.id === Number(categoriaFiltro)
      );
    }
    return filtrados;
  }, [productos, busqueda, categoriaFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const inicio = (paginaSegura - 1) * ITEMS_PER_PAGE;
  const productosPagina = productosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);

  // Stock realmente vendible: excluye lotes ya vencidos (stock_vigente lo
  // calcula el backend; si no viniera por algún motivo, usar stock a secas
  // como respaldo en vez de bloquear todo).
  const stockVendible = (p) => p?.stock_vigente ?? p?.stock ?? 0;

  // ─── Caché del carrito en localStorage ─────────────────────────────────────
  // Si se recarga la página a medio armar una venta (F5, cierre accidental de
  // pestaña, caída de red), el carrito no debería perderse. Se guarda por
  // usuario (distintos cajeros en el mismo equipo no comparten carrito) y se
  // reconcilia contra el stock real apenas cargan los productos, por si algo
  // cambió mientras la pestaña estuvo cerrada.
  const carritoStorageKey = usuario ? `pos_carrito_${usuario.id}` : null;
  const carritoRestaurado = useRef(false);
  const carritoReconciliado = useRef(false);

  useEffect(() => {
    if (!carritoStorageKey || esSoloLectura || carritoRestaurado.current) return;
    carritoRestaurado.current = true;
    try {
      const guardado = JSON.parse(localStorage.getItem(carritoStorageKey) || '[]');
      if (Array.isArray(guardado) && guardado.length > 0) setCarrito(guardado);
    } catch {
      // localStorage corrupto o inaccesible: se ignora, el carrito arranca vacío
    }
  }, [carritoStorageKey, esSoloLectura]);

  useEffect(() => {
    if (carritoReconciliado.current || productos.length === 0 || carrito.length === 0) return;
    carritoReconciliado.current = true;
    setCarrito((prev) =>
      prev
        .map((item) => {
          const actual = productos.find((p) => p.id === item.id);
          if (!actual || actual.activo === false) return null;
          const max = stockVendible(actual);
          if (max <= 0) return null;
          const cantidadPrevia = item.cantidad ?? 1;
          return { ...actual, cantidad: Math.min(cantidadPrevia, max) };
        })
        .filter(Boolean)
    );
  }, [productos]);

  useEffect(() => {
    if (!carritoStorageKey || esSoloLectura) return;
    localStorage.setItem(carritoStorageKey, JSON.stringify(carrito));
  }, [carrito, carritoStorageKey, esSoloLectura]);

  // Agrega 1 unidad del producto (click rápido en la tarjeta o escaneo de
  // código de barras). Si el producto ya está en el carrito, solo incrementa
  // la cantidad de esa fila.
  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        const max = stockVendible(producto);
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, max || item.cantidad) }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, nuevaCantidad) => {
    const prod = productos.find((p) => p.id === id);
    setCarrito((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const max = (prod ? stockVendible(prod) : null) || 99;
        return { ...item, cantidad: Math.max(1, Math.min(nuevaCantidad, max)) };
      })
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const vuelto = montoRecibido ? parsearMontoRecibido(montoRecibido) - total : 0;

  // Efectivo disponible ahora mismo en el turno (apertura + movimientos en
  // efectivo) — solo una guía de UX, igual que turnoActivo: el backend
  // vuelve a validarlo con el turno bloqueado antes de aceptar la venta.
  const efectivoDisponibleTurno = () => {
    if (!turnoActivo?.movimientos) return null;
    return calcularMontosCaja(turnoActivo.movimientos).efectivo;
  };

  const efectivoDisponible = metodoPago === 'Efectivo' ? efectivoDisponibleTurno() : null;
  const vueltoInsuficiente =
    metodoPago === 'Efectivo' && vuelto > 0 && efectivoDisponible != null && efectivoDisponible < vuelto;

  const datosClienteValidos = () => {
    if (tipoComprobante === 'BoletaSimple') return true;
    if (tipoComprobante === 'BoletaDNI') return /^\d{8}$/.test(clienteDni) && dniValidado && clienteId != null;
    if (tipoComprobante === 'Factura') {
      return /^\d{11}$/.test(clienteRuc) && rucValidado;
    }
    return false;
  };

  // null = ya se confirmó que no hay turno abierto (undefined = aún cargando, no bloquea)
  const sinTurno = !esSoloLectura && turnoActivo === null;

  const puedeVender =
    !sinTurno &&
    carrito.length > 0 &&
    (metodoPago !== 'Efectivo' || (montoRecibido && parsearMontoRecibido(montoRecibido) >= total)) &&
    !vueltoInsuficiente &&
    (metodoPago !== 'Yape' || yapeVerificado) &&
    datosClienteValidos();

  const resetear = () => {
    setCarrito([]);
    if (carritoStorageKey) localStorage.removeItem(carritoStorageKey);
    setMontoRecibido('');
    setYapeVerificado(false);
    setVentaExitosa(null);
    setBusqueda('');
    setCategoriaFiltro('');
    setPaginaActual(1);
    setCodigoBarras('');
    setTipoComprobante('BoletaSimple');
    setClienteDni('');
    setClienteRuc('');
    setClienteRazonSocial('');
    setClienteDireccion('');
    setNombreDni('');
    setDniValidado(false);
    setRucValidado(false);
    setRucInfo(null);
    setClienteId(null);
    setClienteNombreNoCoincide(false);
    setError('');
    setPdfError('');
    setPasoYape('inicio');
    setReferenciaPago('');
    inputCodigoRef.current?.focus();
  };

  const buscarDni = async () => {
    if (clienteDni.length !== 8) return;
    setBuscandoDni(true);
    setDniValidado(false);
    setClienteNombreNoCoincide(false);
    setError('');
    try {
      const { data } = await api.get(`/consulta/dni/${clienteDni}`);
      setNombreDni(data.nombre_completo);
      setDniValidado(true);
      try {
        const { data: cliente } = await api.post('/clientes/buscar-o-crear', {
          nombre: data.nombre_completo,
          dni: clienteDni,
        });
        setClienteId(cliente.id);
        setClienteNombreNoCoincide(cliente.nombre_coincide === false);
      } catch {
        // clienteId se queda en null; datosClienteValidos() bloqueará la venta
        // hasta que se reintente la consulta de DNI con éxito.
      }
    } catch (err) {
      setNombreDni('');
      setError(err.response?.data?.mensaje || 'No se encontró información para ese DNI');
    } finally {
      setBuscandoDni(false);
    }
  };

  const buscarRuc = async (rucValue) => {
    const ruc = rucValue ?? clienteRuc;
    if (ruc.length !== 11) return;
    setBuscandoRuc(true);
    setRucValidado(false);
    setRucInfo(null);
    setClienteRazonSocial('');
    setClienteDireccion('');
    setError('');
    try {
      const { data } = await api.get(`/consulta/ruc/${ruc}`);

      if (data.estado && data.estado.toUpperCase() !== 'ACTIVO') {
        setError(`RUC dado de baja en SUNAT (estado: ${data.estado})`);
        return;
      }
      if (data.condicion && data.condicion.toUpperCase() !== 'HABIDO') {
        setError(`RUC con domicilio no habido en SUNAT (condición: ${data.condicion})`);
        return;
      }

      if (data.razon_social) setClienteRazonSocial(data.razon_social);
      if (data.direccion) setClienteDireccion(data.direccion);
      setRucValidado(true);
      setRucInfo({ razon_social: data.razon_social, condicion: data.condicion, estado: data.estado });
    } catch (err) {
      setError(err.response?.data?.mensaje || 'No se encontró información para ese RUC en SUNAT');
    } finally {
      setBuscandoRuc(false);
    }
  };

  const realizarVenta = async () => {
    setError('');

    if (sinTurno) {
      setError('No puedes realizar ventas porque no tienes un turno de caja abierto. Abre un turno para continuar.');
      return;
    }

    if (vueltoInsuficiente) {
      setError(`Monto en caja insuficiente para dar el vuelto. Efectivo disponible: S/. ${efectivoDisponible.toFixed(2)}. Registra un ingreso en Caja antes de continuar.`);
      return;
    }

    if (!datosClienteValidos()) {
      if (tipoComprobante === 'BoletaDNI') {
        if (!/^\d{8}$/.test(clienteDni)) {
          setError('El DNI debe tener exactamente 8 dígitos');
        } else if (!dniValidado) {
          setError('Debes verificar el DNI con RENIEC antes de continuar');
        } else {
          setError('No se pudo registrar el cliente con ese DNI. Vuelve a consultar el DNI antes de continuar.');
        }
      } else if (tipoComprobante === 'Factura') {
        setError('El RUC debe tener 11 dígitos');
      }
      return;
    }

    const itemSinStock = carrito.find((i) => i.cantidad > stockVendible(i));
    if (itemSinStock) {
      const disponible = stockVendible(itemSinStock);
      setError(
        disponible < itemSinStock.stock
          ? `"${itemSinStock.nombre}" tiene unidades vencidas: solo hay ${disponible} vigente(s) disponible(s)`
          : `Stock insuficiente para "${itemSinStock.nombre}". Disponible: ${disponible}`
      );
      return;
    }

    setLoading(true);

    try {
      const body = {
        cliente_id: tipoComprobante === 'BoletaDNI' ? clienteId : null,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'Efectivo' ? parsearMontoRecibido(montoRecibido) : null,
        yape_verificado: metodoPago === 'Yape' ? yapeVerificado : false,
        referencia_pago: metodoPago === 'Yape' ? (referenciaPago.trim() || null) : null,
        items: carrito.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
        })),
        tipo_comprobante: tipoComprobante === 'Factura' ? 'Factura' : 'Boleta',
        cliente_dni: tipoComprobante === 'BoletaDNI' ? clienteDni : null,
        cliente_ruc: tipoComprobante === 'Factura' ? clienteRuc : null,
        cliente_razon_social: tipoComprobante === 'Factura' ? clienteRazonSocial : null,
        cliente_direccion: tipoComprobante === 'Factura' ? clienteDireccion : null,
      };

      const { data } = await api.post('/ventas', body);
      setVentaExitosa(data);
      setModalComprobante(true);
      generarYDescargarComprobante(data);
      cargarProductos();
      notificarCambioStock();
    } catch (err) {
      if (!err.response) {
        setError('Sin respuesta del servidor. Verifique si la venta fue registrada antes de reintentar.');
      } else {
        setError(err.response?.data?.mensaje || err.response?.data?.message || 'Error al realizar venta');
      }
    } finally {
      setLoading(false);
    }
  };

  const generarYDescargarComprobante = async (venta) => {
    setPdfError('');
    try {
      await generarComprobantePDF(venta, empresa, igv);
    } catch (err) {
      setPdfError(err.message || 'Error al generar el comprobante PDF');
    }
  };

  const descargarPDF = () => {
    if (ventaExitosa) generarYDescargarComprobante(ventaExitosa);
  };

  const cerrarComprobante = () => {
    setModalComprobante(false);
    resetear();
  };

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Punto de Venta</h1>
          {esSoloLectura && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              Modo consulta
            </span>
          )}
        </div>

        {sinTurno && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <p className="flex-1">
              No puedes realizar ventas porque no tienes un turno de caja abierto. Abre un turno para continuar.
            </p>
            <Link
              to="/caja"
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Ir a Mi Caja
            </Link>
          </div>
        )}

        {!esSoloLectura && (
          <>
            <div className="relative">
              <ScanLine className={`absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${barcodeFocused ? 'text-green-500' : 'text-gray-400'}`} />
              <input
                ref={inputCodigoRef}
                type="text"
                value={codigoBarras}
                onChange={(e) => setCodigoBarras(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarPorCodigo()}
                onFocus={() => setBarcodeFocused(true)}
                onBlur={() => setBarcodeFocused(false)}
                placeholder={barcodeFocused ? 'Escanea o escribe el código...' : 'Haz clic aquí para escanear un producto'}
                autoFocus
                className={`w-full rounded-2xl border-2 bg-white px-4 py-3 pl-10 pr-36 text-base shadow-sm focus:outline-none focus:ring-2 transition-colors ${
                  barcodeFocused
                    ? 'border-green-400 focus:ring-green-100'
                    : 'border-indigo-200 focus:border-indigo-400 focus:ring-indigo-100'
                }`}
              />
              {barcodeFocused && !buscandoCodigo && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-green-600 pointer-events-none">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Listo para escanear
                </span>
              )}
              {buscandoCodigo && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-indigo-500" />
              )}
            </div>
          </>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-[#6366f1] text-white">
                <th className="px-4 py-3 font-medium">Producto</th>
                <th className="px-4 py-3 font-medium">Precio Unit.</th>
                <th className="px-4 py-3 font-medium">Cantidad</th>
                <th className="px-4 py-3 font-medium">Subtotal</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carrito.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-400">
                    <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    Escanea un producto para agregarlo al carrito
                  </td>
                </tr>
              ) : (
                carrito.map((item, i) => (
                  <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{item.nombre}</span>
                      <span className="ml-1 text-gray-400">{item.marca}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      S/. {Number(item.precio).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          value={item.cantidad}
                          min={1}
                          max={stockVendible(item)}
                          onChange={(e) =>
                            cambiarCantidad(item.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-12 rounded border border-gray-200 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <button
                          onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                          className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      S/. {(item.precio * item.cantidad).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {carrito.length > 0 && (
          <div className="text-right text-xl font-bold text-gray-800">
            Total: S/. {total.toFixed(2)}
          </div>
        )}

        <button
          onClick={() => setMostrarLista(!mostrarLista)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {mostrarLista ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {mostrarLista ? 'Ocultar lista de productos' : 'Mostrar lista de productos'}
        </button>

        {mostrarLista && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                  placeholder="Buscar producto por nombre o marca..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => { setCategoriaFiltro(e.target.value); setPaginaActual(1); }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
              <span className="text-sm text-gray-400">
                {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {productosPagina.length === 0 ? (
                <div className="col-span-5 py-10 text-center text-sm text-gray-400">
                  No se encontraron productos
                </div>
              ) : (
                productosPagina.map((p) => {
                  const disponible = stockVendible(p);
                  const vencidoTotal = p.stock > 0 && disponible === 0;
                  const vencidoParcial = disponible > 0 && disponible < p.stock;
                  const sinStock = disponible === 0;
                  const enCarrito = carrito.some((item) => item.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col items-start rounded-xl border p-3 text-left text-sm ${
                        sinStock
                          ? 'border-gray-100 bg-gray-50 opacity-50'
                          : vencidoParcial
                            ? 'border-amber-200 bg-amber-50'
                            : esSoloLectura
                              ? 'border-gray-200 bg-white'
                              : enCarrito
                                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                      } ${!esSoloLectura && !sinStock ? 'cursor-pointer transition-all' : ''}`}
                      onClick={() => !esSoloLectura && !sinStock && agregarAlCarrito(p)}
                      title={vencidoTotal ? 'Todo el stock de este producto está vencido' : vencidoParcial ? `Solo ${disponible} unidad(es) vigente(s); el resto está vencido` : undefined}
                    >
                      <span className="font-medium text-gray-800 leading-tight">{p.nombre}</span>
                      <span className="mt-0.5 text-gray-400 text-xs">{p.marca}</span>
                      <div className="mt-2 flex w-full items-center justify-between">
                        <span className="font-semibold text-indigo-600">
                          S/. {Number(p.precio).toFixed(2)}
                        </span>
                        {vencidoTotal ? (
                          <span className="text-xs text-red-500 font-medium">Vencido</span>
                        ) : sinStock ? (
                          <span className="text-xs text-red-400 font-medium">Sin stock</span>
                        ) : vencidoParcial ? (
                          <span className="text-xs text-amber-600 font-medium">⚠ {disponible} vigente(s)</span>
                        ) : (
                          <span className="text-xs text-gray-400">{p.stock} ud.</span>
                        )}
                      </div>
                      {enCarrito && (
                        <span className="absolute right-2 top-2 rounded-full bg-indigo-500 px-1.5 py-0.5 text-xs text-white">
                          {carrito.find((item) => item.id === p.id)?.cantidad}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pag) => (
                  <button
                    key={pag}
                    onClick={() => setPaginaActual(pag)}
                    className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                      pag === paginaSegura
                        ? 'bg-[#6366f1] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pag}
                  </button>
                ))}
                <button
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {esSoloLectura ? (
        <div className="w-80">
          <div className="sticky top-4 rounded-2xl border border-gray-100 bg-amber-50 p-5 shadow-sm">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-3xl">🔍</span>
              <p className="text-sm font-medium text-amber-800">Modo consulta</p>
              <p className="text-xs text-amber-600">
                Puedes navegar los productos, pero no realizar ventas.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-80">
          <div className="sticky top-4 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-gray-700">Resumen de Venta</h3>
              <hr className="border-gray-100" />

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-800">S/. {total.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-lg font-bold text-gray-800">
                  <span>Total</span>
                  <span>S/. {total.toFixed(2)}</span>
                </div>
              </div>

              <hr className="my-3 border-gray-100" />

              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de comprobante</label>
                <select
                  value={tipoComprobante}
                  onChange={(e) => setTipoComprobante(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value="BoletaSimple">Boleta Simple</option>
                  <option value="BoletaDNI">Boleta con DNI</option>
                  <option value="Factura">Factura</option>
                </select>
              </div>

              {tipoComprobante === 'BoletaDNI' && (
                <div className="mb-3">
                  <label className="mb-1 block text-sm font-medium text-gray-700">DNI <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clienteDni}
                      onChange={(e) => { setClienteDni(e.target.value.replace(/\D/g, '').slice(0, 8)); setNombreDni(''); setDniValidado(false); }}
                      onKeyDown={(e) => e.key === 'Enter' && buscarDni()}
                      placeholder="12345678"
                      maxLength={8}
                      className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      type="button"
                      onClick={buscarDni}
                      disabled={clienteDni.length !== 8 || buscandoDni}
                      title="Consultar RENIEC"
                      className="rounded-lg bg-indigo-500 px-3 py-2 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                    >
                      {buscandoDni ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                  {clienteDni.length > 0 && clienteDni.length < 8 && (
                    <p className="mt-1 text-xs text-red-500">El DNI debe tener 8 dígitos</p>
                  )}
                  {nombreDni && (
                    <p className="mt-1 text-xs font-medium text-emerald-600">{nombreDni}</p>
                  )}
                  {clienteNombreNoCoincide && (
                    <p className="mt-1 text-xs text-amber-600">
                      ⚠ Este DNI ya estaba registrado con otro nombre. Verifica que sea la persona correcta.
                    </p>
                  )}
                </div>
              )}

              {tipoComprobante === 'Factura' && (
                <div className="mb-3 space-y-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">RUC <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clienteRuc}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 11);
                          setClienteRuc(val);
                          setRucValidado(false);
                          setRucInfo(null);
                          if (val.length === 11) buscarRuc(val);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && buscarRuc()}
                        placeholder="20123456789"
                        maxLength={11}
                        className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={buscarRuc}
                        disabled={clienteRuc.length !== 11 || buscandoRuc}
                        title="Consultar SUNAT"
                        className="rounded-lg bg-indigo-500 px-3 py-2 text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
                      >
                        {buscandoRuc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </button>
                    </div>
                    {clienteRuc.length > 0 && clienteRuc.length < 11 && (
                      <p className="mt-1 text-xs text-red-500">El RUC debe tener 11 dígitos</p>
                    )}
                    {rucValidado && rucInfo && (
                      <p className="mt-1 text-xs font-medium text-emerald-600">
                        ✓ {rucInfo.razon_social} — {rucInfo.estado} / {rucInfo.condicion}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Razón Social <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={clienteRazonSocial}
                      onChange={(e) => setClienteRazonSocial(e.target.value)}
                      placeholder="Nombre de la empresa"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Dirección <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={clienteDireccion}
                      onChange={(e) => setClienteDireccion(e.target.value)}
                      placeholder="Av. Ejemplo 123"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              )}

              <select
                value={metodoPago}
                onChange={(e) => { setMetodoPago(e.target.value); setYapeVerificado(false); setPasoYape('inicio'); setReferenciaPago(''); }}
                className="w-full rounded-lg border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Yape">Yape</option>
              </select>

              {metodoPago === 'Yape' && (
                <div className="mt-3 space-y-3">
                  {yapeVerificado ? (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
                      <div>
                        <p className="font-medium">Pago Yape/Plin confirmado — S/. {total.toFixed(2)}</p>
                        {referenciaPago.trim() && (
                          <p className="text-xs text-emerald-600">N° operación: {referenciaPago.trim()}</p>
                        )}
                      </div>
                    </div>
                  ) : pasoYape === 'inicio' ? (
                    <div className="space-y-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50 p-4">
                      <div className="flex items-center gap-2 text-violet-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">1</span>
                        <span className="text-sm font-semibold">Generar cobro en IziPay</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Abre la app <strong>IziPay</strong> en el POS, ingresa el monto exacto y genera el QR de cobro.
                      </p>
                      <div className="rounded-lg bg-white px-4 py-3 text-center">
                        <p className="text-xs text-gray-500">Monto a ingresar en IziPay</p>
                        <p className="text-2xl font-bold text-violet-700">S/. {total.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => setPasoYape('mostrando')}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
                      >
                        <QrCode className="h-4 w-4" />
                        Ya generé el cobro en IziPay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50 p-4">
                      <div className="flex items-center gap-2 text-violet-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">2</span>
                        <span className="text-sm font-semibold">Cliente escanea y paga</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Muestra la pantalla de IziPay al cliente para que escanee con Yape o Plin y pague <strong>S/. {total.toFixed(2)}</strong>. Verifica en la app que el pago se haya completado antes de confirmar.
                      </p>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">N° de operación (opcional)</label>
                        <input
                          type="text"
                          value={referenciaPago}
                          onChange={(e) => setReferenciaPago(e.target.value)}
                          placeholder="Ej. 00123456"
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                      <button
                        onClick={() => setYapeVerificado(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Pago confirmado en IziPay
                      </button>
                      <button
                        onClick={() => setPasoYape('inicio')}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        <X className="h-4 w-4" />
                        Volver
                      </button>
                    </div>
                  )}
                </div>
              )}

              {metodoPago === 'Efectivo' && (
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(sanitizarMontoRecibido(e.target.value))}
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const texto = e.clipboardData.getData('text');
                        setMontoRecibido((prev) => sanitizarMontoRecibido(prev + texto));
                      }}
                      placeholder="Monto recibido"
                      className="w-full rounded-lg border border-gray-200 px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    {vuelto >= 0 ? (
                      <>
                        <span className="text-gray-500">Vuelto</span>
                        <span className="font-medium text-green-600">S/. {vuelto.toFixed(2)}</span>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-red-500">Faltan</span>
                        <span className="font-bold text-red-500">S/. {Math.abs(vuelto).toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  {vueltoInsuficiente && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Monto en caja insuficiente para el vuelto. Disponible: S/. {efectivoDisponible.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                onClick={realizarVenta}
                disabled={!puedeVender || loading}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#6366f1] py-3 font-semibold text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Realizar Venta'
                )}
              </button>

              <button
                onClick={resetear}
                className="mt-2 w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
              >
                Vaciar carrito
              </button>
            </div>

          </div>
        </div>
      )}
      {modalComprobante && ventaExitosa && (
        <ModalComprobante venta={ventaExitosa} empresa={empresa} pdfError={pdfError} onCerrar={cerrarComprobante} onDescargarPDF={descargarPDF} />
      )}

    </div>
  );
}
