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

    if (response.status === 404) {
      return res.status(404).json({ mensaje: 'RUC no encontrado en SUNAT' });
    }

    if (!response.ok) {
      return res.status(502).json({ mensaje: `Error al consultar SUNAT (${response.status})` });
    }

    const data = JSON.parse(rawText);

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
    return res.status(503).json({ mensaje: 'Servicio de consulta de RUC no disponible' });
  }
};

module.exports = { consultarDni, consultarRuc };
