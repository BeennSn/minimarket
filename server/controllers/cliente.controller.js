const { Cliente, Venta } = require('../models');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Solo lectura: consulta si ya existe un cliente con ese DNI, sin crearlo.
// El cliente se crea recién cuando la venta se concreta (venta.controller.js),
// no al validar el DNI — antes esto usaba findOrCreate y quedaba un registro
// de Cliente huérfano cada vez que un cajero solo consultaba el DNI sin
// llegar a vender.
const buscarPorDni = async (req, res) => {
  try {
    const { dni } = req.params;
    if (!/^\d{8}$/.test(dni)) {
      return res.status(400).json({ mensaje: 'DNI inválido' });
    }

    const cliente = await Cliente.findOne({ where: { dni } });
    if (!cliente) {
      return res.status(200).json({ existe: false });
    }

    return res.status(200).json({ existe: true, id: cliente.id, nombre: cliente.nombre, dni: cliente.dni });
  } catch (err) {
    console.error('Error en buscarPorDni cliente:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const listar = async (req, res) => {
  try {
    const clientes = await Cliente.findAll({
      include: [{ model: Venta, as: 'ventas', attributes: ['id'] }],
      order: [['nombre', 'ASC']],
    });
    return res.status(200).json(
      clientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        dni: c.dni,
        email: c.email,
        total_compras: c.ventas.length,
      }))
    );
  } catch (err) {
    console.error('Error en listar clientes:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const actualizar = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (email && !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ mensaje: 'Formato de email inválido' });
    }

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ mensaje: 'Cliente no encontrado' });

    await cliente.update({ email: email || null });
    return res.status(200).json({
      id: cliente.id,
      nombre: cliente.nombre,
      dni: cliente.dni,
      email: cliente.email,
    });
  } catch (err) {
    console.error('Error en actualizar cliente:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { buscarPorDni, listar, actualizar };
