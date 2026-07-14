// Consultas contra RENIEC/SUNAT (vía decolecta.com). Centralizado acá porque
// lo necesita más de un lugar: consulta.controller (endpoint que usa el
// frontend para autocompletar DNI/RUC) y venta.controller (revalida el RUC
// server-side antes de aceptar una venta con Factura — el frontend puede
// omitirse llamando la API de ventas directo, así que la validación real
// tiene que vivir acá también, no solo en la UI).
// Ambas funciones lanzan { status, mensaje } en los mismos casos que antes
// respondía el controller directamente, para que cualquier consumidor pueda
// traducirlo a una respuesta HTTP con el mismo criterio.

const APIS_PERU_TOKEN = process.env.APIS_PERU_TOKEN;
const BASE_URL = 'https://api.decolecta.com/v1';

const headers = () => ({
  Authorization: `Bearer ${APIS_PERU_TOKEN}`,
  Accept: 'application/json',
});

// Antes, sin token configurado, se mandaba igual "Bearer undefined" y
// decolecta respondía 401 — el mensaje de error no distinguía "falta
// configurar" de "SUNAT/RENIEC está caído", dificultando el diagnóstico.
const requireToken = () => {
  if (!APIS_PERU_TOKEN) {
    throw { status: 500, mensaje: 'Servicio de consulta de RUC/DNI no configurado (falta APIS_PERU_TOKEN)' };
  }
};

const consultarDniReniec = async (dni) => {
  requireToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}/reniec/dni?numero=${dni}`, { headers: headers() });
  } catch (err) {
    console.error('Error de red al consultar RENIEC:', err);
    throw { status: 503, mensaje: 'No se pudo conectar con el servicio de RENIEC. Intenta nuevamente en unos minutos.' };
  }

  const rawText = await response.text();
  console.log(`[consulta DNI] status=${response.status} body=${rawText}`);

  if (response.status === 404) {
    throw { status: 404, mensaje: 'DNI no encontrado en RENIEC' };
  }
  if (!response.ok) {
    console.error(`Error al consultar RENIEC: status=${response.status} body=${rawText}`);
    throw { status: 502, mensaje: 'No se pudo consultar RENIEC en este momento. Intenta nuevamente más tarde.' };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('Respuesta de RENIEC no es JSON válido:', rawText);
    throw { status: 502, mensaje: 'No se pudo consultar RENIEC en este momento. Intenta nuevamente más tarde.' };
  }

  return {
    nombres: data.first_name,
    apellido_paterno: data.first_last_name,
    apellido_materno: data.second_last_name,
    nombre_completo: data.full_name || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim(),
  };
};

const consultarRucSunat = async (ruc) => {
  requireToken();

  let response;
  try {
    response = await fetch(`${BASE_URL}/sunat/ruc?numero=${ruc}`, { headers: headers() });
  } catch (err) {
    console.error('Error de red al consultar SUNAT:', err);
    throw { status: 503, mensaje: 'No se pudo conectar con el servicio de SUNAT. Intenta nuevamente en unos minutos.' };
  }

  const rawText = await response.text();
  console.log(`[consulta RUC] status=${response.status} body=${rawText}`);

  // decolecta.com no siempre usa 404 para "el RUC no existe" — un RUC bien
  // formado pero inexistente o inválido en SUNAT suele volver como 400 o 422
  // con un mensaje en el body, no como 404.
  if ([400, 404, 422].includes(response.status)) {
    throw { status: 404, mensaje: 'RUC inaceptable: no se encontró información para ese número en SUNAT.' };
  }

  if (!response.ok) {
    console.error(`Error al consultar SUNAT: status=${response.status} body=${rawText}`);
    throw { status: 502, mensaje: 'No se pudo consultar SUNAT en este momento. Intenta nuevamente más tarde.' };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('Respuesta de SUNAT no es JSON válido:', rawText);
    throw { status: 502, mensaje: 'No se pudo consultar SUNAT en este momento. Intenta nuevamente más tarde.' };
  }

  // Algunos RUC inexistentes vuelven con 200 OK pero sin razón social en vez
  // de un status de error — sin ese dato no hay nada útil que devolver.
  if (!data.razon_social) {
    throw { status: 404, mensaje: 'RUC inaceptable: no se encontró información para ese número en SUNAT.' };
  }

  return {
    ruc: data.numero_documento,
    razon_social: data.razon_social,
    estado: data.estado || null,
    condicion: data.condicion || null,
    direccion: data.direccion || null,
    distrito: data.distrito || null,
    provincia: data.provincia || null,
    departamento: data.departamento || null,
  };
};

module.exports = { consultarDniReniec, consultarRucSunat };
