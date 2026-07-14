const APIS_PERU_TOKEN = process.env.APIS_PERU_TOKEN;
const BASE_URL = 'https://api.decolecta.com/v1';

const headers = () => ({
  Authorization: `Bearer ${APIS_PERU_TOKEN}`,
  Accept: 'application/json',
});

const consultarDni = async (req, res) => {
  try {
    const { dni } = req.params;

    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ mensaje: 'El DNI debe tener 8 dígitos' });
    }

    const response = await fetch(`${BASE_URL}/reniec/dni?numero=${dni}`, {
      headers: headers(),
    });

    const rawText = await response.text();
    console.log(`[consulta DNI] status=${response.status} body=${rawText}`);

    if (response.status === 404) {
      return res.status(404).json({ mensaje: 'DNI no encontrado en RENIEC' });
    }

    if (!response.ok) {
      return res.status(502).json({ mensaje: `Error al consultar RENIEC (${response.status})` });
    }

    const data = JSON.parse(rawText);

    return res.status(200).json({
      nombres: data.first_name,
      apellido_paterno: data.first_last_name,
      apellido_materno: data.second_last_name,
      nombre_completo: data.full_name || `${data.first_name} ${data.first_last_name} ${data.second_last_name}`.trim(),
    });
  } catch (err) {
    console.error('Error en consultarDni:', err);
    return res.status(503).json({ mensaje: 'Servicio de consulta de DNI no disponible' });
  }
};

const consultarRuc = async (req, res) => {
  try {
    const { ruc } = req.params;

    if (!/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ mensaje: 'El RUC debe tener 11 dígitos' });
    }

    const response = await fetch(`${BASE_URL}/sunat/ruc?numero=${ruc}`, {
      headers: headers(),
    });

    const rawText = await response.text();
    console.log(`[consulta RUC] status=${response.status} body=${rawText}`);

    // decolecta.com (el proveedor detrás de BASE_URL) no siempre usa 404
    // para "el RUC no existe" — un RUC bien formado pero inexistente o
    // inválido en SUNAT suele volver como 400 o 422 con un mensaje en el
    // body, no como 404. Sin este chequeo, esos casos caían al branch de
    // "!response.ok" de abajo y el usuario veía un código de estado crudo
    // ("Error al consultar SUNAT (422)") en vez de una explicación.
    if ([400, 404, 422].includes(response.status)) {
      return res.status(404).json({ mensaje: 'RUC inaceptable: no se encontró información para ese número en SUNAT.' });
    }

    if (!response.ok) {
      // Acá sí es un problema del servicio (5xx, límite de la API, etc.),
      // no del RUC ingresado — mensaje distinto a propósito.
      console.error(`Error al consultar SUNAT: status=${response.status} body=${rawText}`);
      return res.status(502).json({ mensaje: 'No se pudo consultar SUNAT en este momento. Intenta nuevamente más tarde.' });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error('Respuesta de SUNAT no es JSON válido:', rawText);
      return res.status(502).json({ mensaje: 'No se pudo consultar SUNAT en este momento. Intenta nuevamente más tarde.' });
    }

    // Algunos RUC inexistentes vuelven con 200 OK pero sin razón social en
    // vez de un status de error — sin ese dato no hay nada útil que devolver.
    if (!data.razon_social) {
      return res.status(404).json({ mensaje: 'RUC inaceptable: no se encontró información para ese número en SUNAT.' });
    }

    return res.status(200).json({
      ruc: data.numero_documento,
      razon_social: data.razon_social,
      estado: data.estado || null,
      condicion: data.condicion || null,
      direccion: data.direccion || null,
      distrito: data.distrito || null,
      provincia: data.provincia || null,
      departamento: data.departamento || null,
    });
  } catch (err) {
    console.error('Error en consultarRuc:', err);
    return res.status(503).json({ mensaje: 'No se pudo conectar con el servicio de SUNAT. Intenta nuevamente en unos minutos.' });
  }
};

module.exports = { consultarDni, consultarRuc };
