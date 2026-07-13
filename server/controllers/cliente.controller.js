const { Cliente, Venta } = require('../models');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buscarOCrear = async (req, res) => {
  try {
    const { nombre, dni, email } = req.body;

    if (dni) {
      const [cliente] = await Cliente.findOrCreate({
        where: { dni },
        defaults: { nombre, email },
      });
      return res.status(200).json({ id: cliente.id, nombre: cliente.nombre, dni: cliente.dni, email: cliente.email });
    }

    const nuevo = await Cliente.create({ nombre, email });
    return res.status(200).json({ id: nuevo.id, nombre: nuevo.nombre, dni: null, email: nuevo.email });
  } catch (err) {
    console.error('Error en buscarOCrear cliente:', err);
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

module.exports = { buscarOCrear, listar, actualizar };
