const { Configuracion } = require('../models');

const DEFAULTS = {
  nombre_empresa: 'EMPRESA DE PRUEBA',
  ruc: '99999999999',
  direccion: 'Av. Prueba 000, Ciudad',
  telefono: '000-000000',
  igv: 18,
  serie_boleta: 'B001',
  serie_factura: 'F001',
};

const SERIE_REGEX = /^[A-Z]\d{3}$/;

const obtener = async (req, res) => {
  try {
    const [config] = await Configuracion.findOrCreate({ where: { id: 1 }, defaults: DEFAULTS });
    return res.json(config);
  } catch (err) {
    console.error('Error al obtener configuración:', err);
    return res.status(500).json({ mensaje: 'Error al obtener configuración' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { nombre_empresa, ruc, direccion, telefono, igv, serie_boleta, serie_factura } = req.body;

    if (!nombre_empresa?.trim()) return res.status(400).json({ mensaje: 'El nombre de empresa es requerido' });
    if (!/^\d{11}$/.test(ruc)) return res.status(400).json({ mensaje: 'El RUC debe tener exactamente 11 dígitos' });
    if (!direccion?.trim()) return res.status(400).json({ mensaje: 'La dirección es requerida' });
    if (!telefono?.trim()) return res.status(400).json({ mensaje: 'El teléfono es requerido' });
    const igvNum = Number(igv);
    if (!Number.isFinite(igvNum) || igvNum < 0 || igvNum > 100) {
      return res.status(400).json({ mensaje: 'El IGV debe ser un número entre 0 y 100' });
    }
    const serieBoleta = (serie_boleta || DEFAULTS.serie_boleta).trim().toUpperCase();
    const serieFactura = (serie_factura || DEFAULTS.serie_factura).trim().toUpperCase();
    if (!SERIE_REGEX.test(serieBoleta)) {
      return res.status(400).json({ mensaje: 'La serie de boleta debe tener el formato: 1 letra + 3 dígitos (ej. B001)' });
    }
    if (!SERIE_REGEX.test(serieFactura)) {
      return res.status(400).json({ mensaje: 'La serie de factura debe tener el formato: 1 letra + 3 dígitos (ej. F001)' });
    }

    const [config] = await Configuracion.findOrCreate({ where: { id: 1 }, defaults: DEFAULTS });
    await config.update({
      nombre_empresa: nombre_empresa.trim(),
      ruc,
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      igv: igvNum,
      serie_boleta: serieBoleta,
      serie_factura: serieFactura,
    });

    return res.json(config);
  } catch (err) {
    console.error('Error al actualizar configuración:', err);
    return res.status(500).json({ mensaje: 'Error al actualizar configuración' });
  }
};

module.exports = { obtener, actualizar };
