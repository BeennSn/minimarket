require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { sequelize, Usuario } = require('../models');

(async () => {
  try {
    const [afectados] = await Usuario.update(
      {
        sesion_activa: false,
        session_version: sequelize.literal('session_version + 1'),
        motivo_sesion_cerrada: 'Cierre forzado por SuperAdmin',
      },
      { where: {} }
    );
    console.log(`Sesiones cerradas para ${afectados} usuario(s), incluyendo SuperAdmin.`);
  } catch (err) {
    console.error('Error cerrando sesiones:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
