const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
require('pg');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.DB_SSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  // En serverless (Vercel) cada invocación fría abre su propio pool: sin límites
  // bajos, varias instancias concurrentes agotan las conexiones del Postgres
  // (ej. Neon) y las que quedan esperando un slot libre se cuelgan hasta el
  // "acquire" timeout por defecto de Sequelize (60s) — más que el maxDuration
  // de la función (30s) — y Vercel corta la conexión con un 504 sin log útil.
  // Con estos límites, si no hay conexión disponible falla rápido con un
  // error claro que el catch de cada controller convierte en un 500 normal.
  pool: {
    max: 3,
    min: 0,
    acquire: 10000,
    idle: 5000,
  },
});

module.exports = sequelize;
