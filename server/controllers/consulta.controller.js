const { consultarDniReniec, consultarRucSunat } = require('../services/consulta.service');

const manejarError = (res, err, mensajePorDefecto) => {
  if (err.status && err.mensaje) {
    return res.status(err.status).json({ mensaje: err.mensaje });
  }
  console.error(mensajePorDefecto, err);
  return res.status(503).json({ mensaje: mensajePorDefecto });
};

const consultarDni = async (req, res) => {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ mensaje: 'El DNI debe tener 8 dígitos' });
    }

    const data = await consultarDniReniec(dni);
    return res.status(200).json(data);
  } catch (err) {
    return manejarError(res, err, 'Servicio de consulta de DNI no disponible');
  }
};

const consultarRuc = async (req, res) => {
  try {
    const { ruc } = req.params;
    if (!/^\d{11}$/.test(ruc)) {
      return res.status(400).json({ mensaje: 'El RUC debe tener 11 dígitos' });
    }

    const data = await consultarRucSunat(ruc);
    return res.status(200).json(data);
  } catch (err) {
    return manejarError(res, err, 'No se pudo conectar con el servicio de SUNAT. Intenta nuevamente en unos minutos.');
  }
};

module.exports = { consultarDni, consultarRuc };
