import { useState, useEffect, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Search, User, X, Trash2, Minus, Plus, Banknote,
  CheckCircle, Loader2, ShoppingCart, ChevronLeft, ChevronRight,
  ScanLine, ChevronDown, ChevronUp, FileText, Camera, QrCode,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useConfiguracion } from '../../hooks/useConfiguracion';
import api from '../../utils/axios';

const ITEMS_PER_PAGE = 25;

function numeroALetras(num) {
  const u = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const d = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const ve = ['', 'VEINTIUN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const c = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function convertir(n) {
    if (n === 0) return '';
    if (n < 20) return u[n];
    if (n < 30) return ve[n - 20];
    if (n < 100) {
      const dec = d[Math.floor(n / 10)];
      const uni = n % 10;
      return uni > 0 ? dec + ' Y ' + u[uni] : dec;
    }
    if (n < 1000) return (n === 100 ? 'CIEN' : c[Math.floor(n / 100)] + (n % 100 > 0 ? ' ' + convertir(n % 100) : ''));
    if (n < 1000000) return (Math.floor(n / 1000) === 1 ? 'MIL' : convertir(Math.floor(n / 1000)) + ' MIL') + (n % 1000 > 0 ? ' ' + convertir(n % 1000) : '');
    return (Math.floor(n / 1000000) === 1 ? 'UN MILLÓN' : convertir(Math.floor(n / 1000000)) + ' MILLONES') + (n % 1000000 > 0 ? ' ' + convertir(n % 1000000) : '');
  }
  const entero = Math.floor(num);
  const decimal = Math.round((num - entero) * 100);
  const letras = entero === 0 ? 'CERO' : convertir(entero);
  return `SON: ${letras} CON ${String(decimal).padStart(2, '0')}/100 SOLES`;
}

function generarPDF(venta, empresa, igvRate) {
  const fecha = new Date(venta.createdAt);
  const esFactura = venta.tipo_comprobante === 'Factura';
  const prefijo = esFactura ? 'F' : 'B';
  const numero = `${prefijo}173-${String(venta.id).padStart(8, '0')}`;
  const total = Number(venta.monto_total || venta.total || 0);

  const detalles = venta.detalles || venta.items || [];

  const filasProductos = detalles.map(d => {
    const nom = d.producto?.nombre || d.nombre || '';
    const cant = d.cantidad;
    const pUnit = Number(d.precio_unitario || d.precio || 0);
    const subtotal = Number(d.subtotal || 0);
    return { nombre: nom, cantidad: cant, precioUnitario: pUnit, subtotal };
  });

  const subtotalCalc = filasProductos.reduce((s, f) => s + f.precioUnitario * f.cantidad, 0);
  const montoIgv = subtotalCalc * igvRate;

  if (esFactura) {
    const productosHTML = filasProductos.map(f => `
      <tr>
        <td style="text-align:center;padding:3px 4px;border:1px solid #999;font-size:9px;">${f.cantidad}</td>
        <td style="text-align:center;padding:3px 4px;border:1px solid #999;font-size:9px;">UND</td>
        <td style="text-align:center;padding:3px 4px;border:1px solid #999;font-size:9px;">${String(venta.id).padStart(6, '0')}</td>
        <td style="padding:3px 4px;border:1px solid #999;font-size:9px;">${f.nombre}</td>
        <td style="text-align:right;padding:3px 4px;border:1px solid #999;font-size:9px;">${f.precioUnitario.toFixed(2)}</td>
      </tr>
    `).join('');

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="width:190mm;padding:10mm;font-family:Arial,sans-serif;font-size:10px;color:#000;background:#fff;">
        <style>
          table { border-collapse: collapse; width: 100%; }
          td, th { vertical-align: top; }
          .b-blue { border: 2px solid #a0c4e8; padding: 6px 10px; }
          .b-all { border: 1px solid #999; }
          .bg-gray { background: #f0f0f0; }
          .right { text-align: right; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .mono { font-family: 'Courier New', monospace; }
        </style>

        <!-- ─── Encabezado ─── -->
        <table>
          <tr>
            <td style="width:55%;">
              <div style="font-size:14px;font-weight:bold;margin-bottom:4px;">${empresa.nombre.toUpperCase()}</div>
              <div style="font-size:9px;color:#333;">${empresa.direccion}</div>
              <div style="font-size:9px;color:#333;">Trujillo - La Libertad</div>
            </td>
            <td style="width:45%;">
              <div class="b-blue center" style="float:right;width:240px;">
                <div style="font-size:10px;font-weight:bold;">FACTURA ELECTRÓNICA</div>
                <div style="font-size:11px;font-weight:bold;margin-top:2px;">RUC ${empresa.ruc}</div>
                <div style="font-size:13px;color:#1a5fb4;font-weight:bold;margin-top:4px;">${numero}</div>
              </div>
            </td>
          </tr>
        </table>

        <div style="border-top:2px solid #000;border-bottom:1px solid #a0c4e8;margin:6px 0 10px 0;"></div>

        <!-- ─── Datos del cliente ─── -->
        <table style="margin-bottom:10px;">
          <tr>
            <td style="width:18%;font-size:9px;padding:2px 4px;">Fecha de Vencimiento:</td>
            <td style="width:32%;font-size:9px;padding:2px 4px;">${fecha.toLocaleDateString('es-PE')}</td>
            <td style="width:18%;font-size:9px;padding:2px 4px;">Señor(es):</td>
            <td style="width:32%;font-size:9px;padding:2px 4px;background:#f5f5f5;">${venta.cliente_razon_social || '—'}</td>
          </tr>
          <tr>
            <td style="font-size:9px;padding:2px 4px;">Fecha de Emisión:</td>
            <td style="font-size:9px;padding:2px 4px;">${fecha.toLocaleDateString('es-PE')}</td>
            <td style="font-size:9px;padding:2px 4px;">RUC:</td>
            <td style="font-size:9px;padding:2px 4px;font-weight:bold;">${venta.cliente_ruc || '—'}</td>
          </tr>
          <tr>
            <td style="font-size:9px;padding:2px 4px;">Tipo Moneda:</td>
            <td style="font-size:9px;padding:2px 4px;">SOLES</td>
            <td style="font-size:9px;padding:2px 4px;">Dirección:</td>
            <td style="font-size:9px;padding:2px 4px;">${venta.cliente_direccion || '—'}</td>
          </tr>
          <tr>
            <td style="font-size:9px;padding:2px 4px;">Observación:</td>
            <td style="font-size:9px;padding:2px 4px;" colspan="3"></td>
          </tr>
        </table>

        <!-- ─── Tabla de productos ─── -->
        <table style="margin-bottom:8px;">
          <thead>
            <tr class="bg-gray">
              <th style="width:8%;padding:4px;border:1px solid #999;font-size:9px;font-weight:bold;">Cant.</th>
              <th style="width:10%;padding:4px;border:1px solid #999;font-size:9px;font-weight:bold;">Unidad</th>
              <th style="width:12%;padding:4px;border:1px solid #999;font-size:9px;font-weight:bold;">Código</th>
              <th style="width:48%;padding:4px;border:1px solid #999;font-size:9px;font-weight:bold;">Descripción</th>
              <th style="width:22%;padding:4px;border:1px solid #999;font-size:9px;font-weight:bold;">Valor Unitario</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
            <tr>
              <td colspan="5" style="border:1px solid #999;height:${Math.max(1, 10 - filasProductos.length) * 18}px;"></td>
            </tr>
          </tbody>
        </table>

        <!-- ─── Pie: Total en letras + Tabla de totales ─── -->
        <table>
          <tr>
            <td style="width:55%;vertical-align:top;">
              <div style="font-size:9px;margin-bottom:2px;">Son:</div>
              <div style="font-size:9px;font-weight:bold;">${numeroALetras(total)}</div>
            </td>
            <td style="width:45%;vertical-align:top;">
              <table style="border-collapse:collapse;">
                <tr>
                  <td style="width:60%;padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;">Subtotal de Ventas:</td>
                  <td style="width:40%;padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;">${subtotalCalc.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;">Anticipos:</td>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;">0.00</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;">Descuentos:</td>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;">0.00</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;">Valor de Venta:</td>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;">${subtotalCalc.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;">IGV (${(igvRate * 100).toFixed(0)}%):</td>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;">${montoIgv.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;font-weight:bold;">Importe Total:</td>
                  <td style="padding:3px 6px;border:1px solid #999;font-size:9px;text-align:right;background:#f5f5f5;font-weight:bold;">${total.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="margin-top:10px;border-top:1px solid #999;padding-top:6px;font-size:7px;color:#666;text-align:center;">
          ${empresa.nombre} | ${empresa.direccion} | RUC ${empresa.ruc} | ${empresa.telefono}
        </div>
      </div>
    `;

    const opt = {
      margin: 5,
      filename: `factura_${numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(container.firstElementChild).save();
  } else {
    // ─── BOLETA (estilo clásico / físico) ───
    const productosHTML = filasProductos.map(f => `
      <tr>
        <td style="text-align:center;padding:3px 2px;border:1px solid #999;font-size:9px;">${f.cantidad}</td>
        <td style="padding:3px 2px;border:1px solid #999;font-size:9px;">${f.nombre}</td>
        <td style="text-align:right;padding:3px 2px;border:1px solid #999;font-size:9px;">${f.precioUnitario.toFixed(2)}</td>
        <td style="text-align:right;padding:3px 2px;border:1px solid #999;font-size:9px;">${f.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const container = document.createElement('div');
    container.innerHTML = `
      <div style="width:170mm;padding:8mm;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#000;background:#fff;border:1px solid #666;">
        <style>
          table { border-collapse: collapse; }
          .b-t { border-top: 1px solid #999; }
          .b-b { border-bottom: 1px solid #999; }
          .b-l { border-left: 1px solid #999; }
          .b-r { border-right: 1px solid #999; }
          .bg-g { background: #f5f5f5; }
          .bold { font-weight: bold; }
          .center { text-align: center; }
          .right { text-align: right; }
          .mono { font-family: 'Courier New', monospace; }
        </style>

        <table style="width:100%;margin-bottom:8px;">
          <tr>
            <td style="width:50%;">
              <div style="display:flex;align-items:center;gap:6px;">
                <div style="width:32px;height:32px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:6px;color:#999;">LOGO</div>
                <div>
                  <div style="font-size:16px;font-weight:bold;">${empresa.nombre}</div>
                  <div style="font-size:8px;color:#333;line-height:1.3;">
                    ${empresa.nombre} S.A.C.<br>
                    ${empresa.direccion}<br>
                    Tel: ${empresa.telefono}<br>
                    Trujillo - La Libertad
                  </div>
                </div>
              </div>
            </td>
            <td style="width:50%;">
              <div style="border:2px solid #000;padding:6px 10px;text-align:center;float:right;width:200px;">
                <div style="font-size:9px;">RUC ${empresa.ruc}</div>
                <div style="font-size:12px;font-weight:bold;margin:3px 0;">BOLETA DE VENTA</div>
                <div style="font-size:10px;font-weight:bold;">${numero}</div>
              </div>
            </td>
          </tr>
        </table>

        <div style="border-top:1px solid #000;margin-bottom:10px;"></div>

        <!-- Datos del cliente -->
        <table style="width:100%;margin-bottom:10px;font-size:9px;">
          <tr>
            <td style="width:12%;">Señor(es):</td>
            <td style="width:38%;border-bottom:1px solid #999;">${venta.cliente_razon_social || '—'}</td>
            <td style="width:10%;">DNI:</td>
            <td style="width:15%;border-bottom:1px solid #999;">${venta.cliente_dni || '—'}</td>
            <td style="width:10%;">Fecha:</td>
            <td style="width:15%;border-bottom:1px solid #999;">${fecha.toLocaleDateString('es-PE')}</td>
          </tr>
          <tr>
            <td>Dirección:</td>
            <td colspan="5" style="border-bottom:1px solid #999;">${venta.cliente_direccion || '—'}</td>
          </tr>
          ${venta.cliente_ruc ? `<tr><td>RUC:</td><td colspan="5" style="border-bottom:1px solid #999;">${venta.cliente_ruc}</td></tr>` : ''}
        </table>

        <!-- Tabla de productos -->
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr class="bg-g">
              <th style="width:8%;padding:4px;border:1px solid #999;font-size:9px;">Código</th>
              <th style="width:8%;padding:4px;border:1px solid #999;font-size:9px;">Cant.</th>
              <th style="width:44%;padding:4px;border:1px solid #999;font-size:9px;">Descripción</th>
              <th style="width:20%;padding:4px;border:1px solid #999;font-size:9px;">P.Unitario</th>
              <th style="width:20%;padding:4px;border:1px solid #999;font-size:9px;">P.Venta</th>
            </tr>
          </thead>
          <tbody>
            ${productosHTML}
            <tr>
              <td colspan="5" style="border:1px solid #999;height:${Math.max(1, 8 - filasProductos.length) * 18}px;"></td>
            </tr>
          </tbody>
        </table>

        <table style="width:100%;margin-top:10px;">
          <tr>
            <td style="width:40%;vertical-align:bottom;font-size:8px;">
              <div style="border:1px solid #999;padding:4px;display:inline-block;font-size:7px;">
                AUT. IMPRENTA: 12345678<br>
                RUC: ${empresa.ruc}<br>
                ${empresa.nombre.toUpperCase()} S.A.C.
              </div>
            </td>
            <td style="width:20%;text-align:center;vertical-align:bottom;">
              <div style="font-size:14px;font-weight:bold;border:2px solid #000;padding:6px 12px;display:inline-block;">CANCELADO</div>
              <div style="font-size:8px;margin-top:6px;">${fecha.toLocaleDateString('es-PE')}</div>
            </td>
            <td style="width:40%;text-align:right;vertical-align:bottom;">
              <table style="border-collapse:collapse;float:right;">
                <tr>
                  <td style="padding:4px 10px;font-size:11px;font-weight:bold;border:1px solid #999;">TOTAL</td>
                  <td style="padding:4px 10px;font-size:11px;font-weight:bold;border:1px solid #999;">S/ ${total.toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <div style="margin-top:10px;border-top:1px solid #999;padding-top:6px;font-size:7px;color:#666;text-align:center;">
          ${empresa.nombre} | ${empresa.direccion} | Tel: ${empresa.telefono}
        </div>
      </div>
    `;

    const opt = {
      margin: 5,
      filename: `boleta_${numero}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(container.firstElementChild).save();
  }
}

function ModalComprobante({ venta, onCerrar, onDescargarPDF }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
          <h2 className="mt-3 text-lg font-bold text-gray-800">¡Venta realizada!</h2>
          <p className="mt-1 text-sm text-gray-400">Venta #00{venta?.id}</p>
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
            venta.tipo_comprobante === 'Factura'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}>
            {venta.tipo_comprobante === 'Factura' ? 'Factura' : venta.cliente_dni ? 'Boleta con DNI' : 'Boleta Simple'}
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

        <button
          onClick={onDescargarPDF}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <FileText className="h-4 w-4" />
          {venta.tipo_comprobante === 'Factura' ? 'Descargar Factura PDF' : 'Descargar Boleta PDF'}
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
  const [codigoBarras, setCodigoBarras] = useState('');
  const [buscandoCodigo, setBuscandoCodigo] = useState(false);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [barcodeFocused, setBarcodeFocused] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputCodigoRef = useRef(null);
  const scannerRef = useRef(null);
  const buscarRef = useRef(null);

  const [buscandoDni, setBuscandoDni] = useState(false);
  const [buscandoRuc, setBuscandoRuc] = useState(false);
  const [nombreDni, setNombreDni] = useState('');
  const [rucValidado, setRucValidado] = useState(false);
  const [rucInfo, setRucInfo] = useState(null);
  const [clienteId, setClienteId] = useState(null);

  const cargarProductos = () => {
    api.get('/productos/activos').then(({ data }) => {
      setProductos(Array.isArray(data) ? data : []);
    }).catch((err) => {
      setError(err.response?.data?.mensaje || 'Error al cargar productos');
    });
  };

  useEffect(() => { cargarProductos(); }, []);

  // Mantiene buscarRef siempre actualizado para usarlo desde el scanner sin closures stale
  useEffect(() => { buscarRef.current = buscarPorCodigo; });

  // Inicia/detiene la cámara cuando se abre/cierra el modal
  useEffect(() => {
    if (!showCamera) return;
    let controls;

    Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ]).then(([{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }]) => {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      reader
        .decodeFromConstraints(
          { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
          'barcode-video',
          (result, err) => {
            if (result) {
              controls?.stop();
              setShowCamera(false);
              buscarRef.current(result.getText());
            }
          }
        )
        .then((c) => { controls = c; scannerRef.current = c; })
        .catch(() => setShowCamera(false));
    });

    return () => {
      controls?.stop();
      scannerRef.current = null;
    };
  }, [showCamera]);

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

  const agregarAlCarrito = (producto) => {
    setCarrito((prev) => {
      const existente = prev.find((item) => item.id === producto.id);
      if (existente) {
        return prev.map((item) =>
          item.id === producto.id
            ? { ...item, cantidad: Math.min(item.cantidad + 1, producto.stock) }
            : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id, nuevaCantidad) => {
    const prod = productos.find((p) => p.id === id);
    const max = prod?.stock ?? 99;
    const cantidad = Math.max(1, Math.min(nuevaCantidad, max));
    setCarrito((prev) =>
      prev.map((item) => (item.id === id ? { ...item, cantidad } : item))
    );
  };

  const eliminarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((item) => item.id !== id));
  };

  const total = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const vuelto = montoRecibido ? parseFloat(montoRecibido) - total : 0;

  const datosClienteValidos = () => {
    if (tipoComprobante === 'BoletaSimple') return true;
    if (tipoComprobante === 'BoletaDNI') return /^\d{8}$/.test(clienteDni);
    if (tipoComprobante === 'Factura') {
      return /^\d{11}$/.test(clienteRuc) && rucValidado;
    }
    return false;
  };

  const puedeVender =
    carrito.length > 0 &&
    (metodoPago !== 'Efectivo' || (montoRecibido && parseFloat(montoRecibido) >= total)) &&
    (metodoPago !== 'Yape' || yapeVerificado) &&
    datosClienteValidos();

  const resetear = () => {
    setCarrito([]);
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
    setRucValidado(false);
    setRucInfo(null);
    setClienteId(null);
    setError('');
    setPasoYape('inicio');
    setReferenciaPago('');
    inputCodigoRef.current?.focus();
  };

  const buscarDni = async () => {
    if (clienteDni.length !== 8) return;
    setBuscandoDni(true);
    setError('');
    try {
      const { data } = await api.get(`/consulta/dni/${clienteDni}`);
      setNombreDni(data.nombre_completo);
      try {
        const { data: cliente } = await api.post('/clientes/buscar-o-crear', {
          nombre: data.nombre_completo,
          dni: clienteDni,
        });
        setClienteId(cliente.id);
      } catch {
        // no bloquea la venta si falla el registro del cliente
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

    if (!datosClienteValidos()) {
      if (tipoComprobante === 'BoletaDNI') {
        setError('El DNI debe tener exactamente 8 dígitos');
      } else if (tipoComprobante === 'Factura') {
        setError('El RUC debe tener 11 dígitos');
      }
      return;
    }

    const itemSinStock = carrito.find((i) => i.cantidad > i.stock);
    if (itemSinStock) {
      setError(`Stock insuficiente para "${itemSinStock.nombre}". Disponible: ${itemSinStock.stock}`);
      return;
    }

    setLoading(true);

    try {
      const body = {
        cliente_id: tipoComprobante === 'BoletaDNI' ? clienteId : null,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'Efectivo' ? parseFloat(montoRecibido) : null,
        yape_verificado: metodoPago === 'Yape' ? yapeVerificado : false,
        referencia_pago: metodoPago === 'Yape' ? (referenciaPago.trim() || null) : null,
        items: carrito.map((item) => ({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
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
      generarPDF(data, empresa, igv);
      cargarProductos();
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

  const descargarPDF = () => {
    if (ventaExitosa) generarPDF(ventaExitosa, empresa, igv);
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

        {!esSoloLectura && (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
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
              <button
                onClick={() => setShowCamera(true)}
                title="Escanear con cámara"
                className="flex items-center justify-center rounded-2xl border-2 border-indigo-200 bg-white px-4 text-gray-500 shadow-sm transition-colors hover:border-indigo-400 hover:text-indigo-600"
              >
                <Camera className="h-5 w-5" />
              </button>
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
                          max={item.stock}
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
                  const sinStock = p.stock === 0;
                  const enCarrito = carrito.some((item) => item.id === p.id);
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col items-start rounded-xl border p-3 text-left text-sm ${
                        sinStock
                          ? 'border-gray-100 bg-gray-50 opacity-50'
                          : esSoloLectura
                            ? 'border-gray-200 bg-white'
                            : enCarrito
                              ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
                      } ${!esSoloLectura && !sinStock ? 'cursor-pointer transition-all' : ''}`}
                      onClick={() => !esSoloLectura && !sinStock && agregarAlCarrito(p)}
                    >
                      <span className="font-medium text-gray-800 leading-tight">{p.nombre}</span>
                      <span className="mt-0.5 text-gray-400 text-xs">{p.marca}</span>
                      <div className="mt-2 flex w-full items-center justify-between">
                        <span className="font-semibold text-indigo-600">
                          S/. {Number(p.precio).toFixed(2)}
                        </span>
                        {sinStock ? (
                          <span className="text-xs text-red-400 font-medium">Sin stock</span>
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
                      onChange={(e) => { setClienteDni(e.target.value.replace(/\D/g, '').slice(0, 8)); setNombreDni(''); }}
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
                      type="number"
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      placeholder="Monto recibido"
                      min={0}
                      step="0.01"
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
        <ModalComprobante venta={ventaExitosa} onCerrar={cerrarComprobante} onDescargarPDF={descargarPDF} />
      )}

      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Escanear código de barras</h3>
              <button
                onClick={() => setShowCamera(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-3 text-center text-xs text-gray-500">
              Centra el código de barras dentro del encuadre
            </p>
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video id="barcode-video" className="w-full" autoPlay muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-72 rounded border-2 border-green-400 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
