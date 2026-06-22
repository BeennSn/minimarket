const { Cliente } = require('../models');

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
    const clientes = await Cliente.findAll({ order: [['nombre', 'ASC']] });
    return res.status(200).json(
      clientes.map((c) => ({ id: c.id, nombre: c.nombre, dni: c.dni, email: c.email }))
    );
  } catch (err) {
    console.error('Error en listar clientes:', err);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

module.exports = { buscarOCrear, listar };
