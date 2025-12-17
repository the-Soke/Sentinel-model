import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  }
);

export async function initDB() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    // import models
    const { defineModels } = await import('../models/index.js');
    defineModels(sequelize);
    await sequelize.sync({ alter: true }); // for dev; in prod use migrations
    console.log('Models synced');
  } catch (err) {
    console.error('DB init failed', err);
    throw err;
  }
}

export default sequelize;
