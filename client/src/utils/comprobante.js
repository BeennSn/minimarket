import html2pdf from 'html2pdf.js';
import QRCode from 'qrcode';

// ─── Utilidades de escape / formato ────────────────────────────────────────

function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function money(valor) {
  return `S/ ${Number(valor || 0).toFixed(2)}`;
}

// ─── Monto en letras (Soles) ────────────────────────────────────────────────

export function numeroALetras(num) {
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

// ─── Número de comprobante (serie + correlativo) ───────────────────────────

export function esFacturaVenta(venta) {
  return venta?.tipo_comprobante === 'Factura';
}

export function construirNumeroComprobante(venta, empresa) {
  const serie = esFacturaVenta(venta) ? (empresa?.serieFactura || 'F001') : (empresa?.serieBoleta || 'B001');
  return `${serie}-${String(venta?.id ?? 0).padStart(8, '0')}`;
}

// ─── Desglose de montos (operación gravada/inafecta + IGV) ────────────────
// Los precios del sistema ya incluyen IGV (venta al público), por lo que el
// IGV y el valor de venta se extraen del total en vez de sumarse aparte.

export function calcularDesglose(venta, igvRate) {
  const detalles = venta?.detalles || venta?.items || [];
  const filas = detalles.map((d) => ({
    nombre: d.producto?.nombre || d.nombre || 'Producto',
    marca: d.producto?.marca || d.marca || '',
    codigo: d.producto?.codigo_barras || '',
    cantidad: Number(d.cantidad || 0),
    precioUnitario: Number(d.precio_unitario ?? d.precio ?? 0),
    subtotal: Number(d.subtotal ?? (Number(d.cantidad || 0) * Number(d.precio_unitario ?? d.precio ?? 0))),
  }));

  const total = Number(venta?.monto_total ?? venta?.total ?? filas.reduce((s, f) => s + f.subtotal, 0));
  const tieneIgv = igvRate > 0;
  const gravada = tieneIgv ? total / (1 + igvRate) : 0;
  const igv = tieneIgv ? total - gravada : 0;
  const inafecta = tieneIgv ? 0 : total;

  return { filas, total, gravada, igv, inafecta, tieneIgv };
}

// ─── Validación previa a la generación del comprobante ─────────────────────

export function validarComprobante(venta, empresa) {
  if (!empresa?.nombre?.trim()) return 'Configura el nombre de la empresa en "Datos del Negocio" antes de generar comprobantes.';
  if (!/^\d{11}$/.test(empresa?.ruc || '')) return 'Configura un RUC de empresa válido (11 dígitos) antes de generar comprobantes.';
  if (!empresa?.direccion?.trim()) return 'Configura la dirección de la empresa antes de generar comprobantes.';
  if (!venta?.id) return 'La venta no tiene un identificador válido.';

  const detalles = venta.detalles || venta.items || [];
  if (!detalles.length) return 'El comprobante no tiene productos.';
  if (!(Number(venta.monto_total ?? venta.total) > 0)) return 'El comprobante tiene un importe total inválido.';

  if (esFacturaVenta(venta)) {
    if (!/^\d{11}$/.test(venta.cliente_ruc || '')) return 'La factura requiere un RUC de cliente válido (11 dígitos).';
    if (!venta.cliente_razon_social?.trim()) return 'La factura requiere la razón social del cliente.';
  } else if (venta.cliente_dni && !/^\d{8}$/.test(venta.cliente_dni)) {
    return 'El DNI del cliente no es válido.';
  }
  return null;
}

// ─── QR + resumen (hash representativo del documento) ─────────────────────

function tipoDocSunat(venta) {
  return esFacturaVenta(venta) ? '01' : '03';
}

function tipoDocCliente(venta) {
  if (venta.cliente_ruc) return '6';
  if (venta.cliente_dni) return '1';
  return '0';
}

function nroDocCliente(venta) {
  return venta.cliente_ruc || venta.cliente_dni || '-';
}

function construirContenidoQR({ venta, empresa, numero, desglose, fecha }) {
  const [serie, correlativo] = numero.split('-');
  return [
    empresa.ruc,
    tipoDocSunat(venta),
    serie,
    correlativo,
    desglose.igv.toFixed(2),
    desglose.total.toFixed(2),
    fecha.toISOString().slice(0, 10),
    tipoDocCliente(venta),
    nroDocCliente(venta),
  ].join('|');
}

// Hash determinístico (no criptográfico) usado solo como "resumen" visual del
// documento — evita depender de crypto.subtle, que requiere contexto seguro
// (HTTPS) y no está disponible en despliegues por LAN sobre HTTP simple.
function generarResumen(contenido) {
  let h1 = 0xdeadbeef ^ contenido.length;
  let h2 = 0x41c6ce57 ^ contenido.length;
  for (let i = 0; i < contenido.length; i++) {
    const ch = contenido.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combinado = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  const hex = combinado.toString(16).toUpperCase().padStart(14, '0');
  return hex.match(/.{1,4}/g).join('-');
}

// ─── Generación del PDF ─────────────────────────────────────────────────────

export async function generarComprobantePDF(venta, empresa, igvRate) {
  const error = validarComprobante(venta, empresa);
  if (error) throw new Error(error);

  const esFactura = esFacturaVenta(venta);
  const numero = construirNumeroComprobante(venta, empresa);
  const desglose = calcularDesglose(venta, igvRate);
  const fecha = new Date(venta.createdAt || Date.now());
  const contenidoQR = construirContenidoQR({ venta, empresa, numero, desglose, fecha });
  const resumen = generarResumen(contenidoQR);

  const qrDataUrl = await QRCode.toDataURL(contenidoQR, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 200,
    color: { dark: '#111827', light: '#ffffff' },
  });

  const tipoDocLabel = esFactura ? 'RUC' : (venta.cliente_dni ? 'DNI' : 'Documento');
  const nroDoc = esFactura ? venta.cliente_ruc : (venta.cliente_dni || '—');
  const nombreCliente = esFactura
    ? venta.cliente_razon_social
    : (venta.cliente?.nombre || venta.cliente_razon_social || 'Cliente varios');
  const direccionCliente = esFactura ? venta.cliente_direccion : '';

  const filasHTML = desglose.filas.map((f, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding:6px 8px;text-align:center;border-bottom:1px solid #f3f4f6;">${f.cantidad}</td>
      ${esFactura ? `<td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${esc(f.codigo) || '—'}</td>` : ''}
      <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6;">${esc(f.nombre)}${f.marca ? ` <span style="color:#9ca3af;">(${esc(f.marca)})</span>` : ''}</td>
      <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #f3f4f6;">${money(f.precioUnitario)}</td>
      <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #f3f4f6;font-weight:600;">${money(f.subtotal)}</td>
    </tr>
  `).join('');

  const container = document.createElement('div');
  container.innerHTML = `
    <div style="width:190mm;padding:14mm 16mm;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;background:#ffffff;box-sizing:border-box;">

      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td style="width:58%;vertical-align:top;">
            <div style="font-size:17px;font-weight:700;">${esc(empresa.nombre)}</div>
            <div style="margin-top:4px;font-size:10px;color:#6b7280;line-height:1.6;">
              ${esc(empresa.direccion)}<br>
              ${empresa.telefono ? `Tel: ${esc(empresa.telefono)}<br>` : ''}
              RUC ${esc(empresa.ruc)}
            </div>
          </td>
          <td style="width:42%;vertical-align:top;">
            <div style="float:right;width:220px;border:1.5px solid #6366f1;border-radius:10px;padding:10px 14px;text-align:center;background:#eef2ff;">
              <div style="font-size:10px;font-weight:700;color:#4338ca;letter-spacing:.5px;">
                ${esFactura ? 'FACTURA ELECTRÓNICA' : 'BOLETA DE VENTA ELECTRÓNICA'}
              </div>
              <div style="margin-top:6px;font-size:15px;font-weight:700;color:#4338ca;">${numero}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="height:3px;background:#6366f1;border-radius:2px;margin-bottom:12px;"></div>

      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-bottom:12px;background:#f9fafb;">
        <div style="font-size:9px;font-weight:700;color:#6366f1;letter-spacing:.5px;margin-bottom:6px;">
          ${esFactura ? 'CLIENTE' : 'ADQUIRIENTE'}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <tr>
            <td style="width:16%;padding:2px 0;color:#6b7280;">${tipoDocLabel}:</td>
            <td style="width:34%;padding:2px 0;font-weight:600;">${esc(nroDoc)}</td>
            <td style="width:16%;padding:2px 0;color:#6b7280;">Fecha emisión:</td>
            <td style="width:34%;padding:2px 0;font-weight:600;">${fecha.toLocaleDateString('es-PE')}</td>
          </tr>
          <tr>
            <td style="padding:2px 0;color:#6b7280;">${esFactura ? 'Razón social' : 'Nombre'}:</td>
            <td style="padding:2px 0;font-weight:600;" colspan="3">${esc(nombreCliente)}</td>
          </tr>
          ${direccionCliente ? `
          <tr>
            <td style="padding:2px 0;color:#6b7280;">Dirección:</td>
            <td style="padding:2px 0;font-weight:600;" colspan="3">${esc(direccionCliente)}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:2px 0;color:#6b7280;">Moneda:</td>
            <td style="padding:2px 0;font-weight:600;">Soles (PEN)</td>
            <td style="padding:2px 0;color:#6b7280;">IGV:</td>
            <td style="padding:2px 0;font-weight:600;">${(igvRate * 100).toFixed(0)}%</td>
          </tr>
        </table>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#6366f1;color:#ffffff;">
            <th style="padding:7px 8px;text-align:center;font-weight:600;">Cant.</th>
            ${esFactura ? '<th style="padding:7px 8px;text-align:left;font-weight:600;">Código</th>' : ''}
            <th style="padding:7px 8px;text-align:left;font-weight:600;">Descripción</th>
            <th style="padding:7px 8px;text-align:right;font-weight:600;">P. Unit.</th>
            <th style="padding:7px 8px;text-align:right;font-weight:600;">Importe</th>
          </tr>
        </thead>
        <tbody>
          ${filasHTML}
        </tbody>
      </table>

      <table style="width:100%;border-collapse:collapse;margin-top:14px;">
        <tr>
          <td style="width:55%;vertical-align:top;padding-top:4px;">
            <div style="font-size:9px;color:#6b7280;">Importe en letras</div>
            <div style="font-size:10px;font-weight:600;margin-top:2px;">${numeroALetras(desglose.total)}</div>
          </td>
          <td style="width:45%;vertical-align:top;">
            <table style="width:100%;border-collapse:collapse;font-size:10px;">
              <tr>
                <td style="padding:4px 8px;color:#6b7280;text-align:right;">${desglose.tieneIgv ? 'Operación gravada' : 'Operación inafecta'}</td>
                <td style="padding:4px 8px;text-align:right;font-weight:600;width:90px;">${money(desglose.tieneIgv ? desglose.gravada : desglose.inafecta)}</td>
              </tr>
              <tr>
                <td style="padding:4px 8px;color:#6b7280;text-align:right;">IGV (${(igvRate * 100).toFixed(0)}%)</td>
                <td style="padding:4px 8px;text-align:right;font-weight:600;">${money(desglose.igv)}</td>
              </tr>
              <tr style="background:#eef2ff;">
                <td style="padding:6px 8px;text-align:right;font-weight:700;color:#4338ca;">Importe total</td>
                <td style="padding:6px 8px;text-align:right;font-weight:700;color:#4338ca;">${money(desglose.total)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:10px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:70px;vertical-align:top;">
              <img src="${qrDataUrl}" style="width:64px;height:64px;" />
            </td>
            <td style="vertical-align:top;padding-left:10px;font-size:8px;color:#6b7280;line-height:1.6;">
              Representación impresa del comprobante de pago electrónico. Consérvela para efectos tributarios.<br>
              Resumen: <span style="font-family:'Courier New',monospace;color:#374151;">${resumen}</span><br>
              Emisor: ${esc(empresa.nombre)} — RUC ${esc(empresa.ruc)}
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;

  const opt = {
    margin: 8,
    filename: `${esFactura ? 'factura' : 'boleta'}_${numero}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  await html2pdf().set(opt).from(container.firstElementChild).save();
}
