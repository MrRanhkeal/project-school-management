'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../logger');


 //exhausting MySQL's max_connections at ~10k students of read/write load.
function createSequelize(overrides = {}) {
  const db = { ...config.db, ...overrides };

  const sequelize = new Sequelize(db.name, db.user, db.password, {
    host: db.host,
    port: db.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: db.pool.max,
      min: db.pool.min,
      idle: db.pool.idle,
      acquire: db.pool.acquire,
    },
    define: {
      underscored: true,
      timestamps: true,
    },
    dialectOptions: {
      // keep numeric ids as strings? no — but ensure utf8mb4 for names
      charset: 'utf8mb4',
    },
  });

  return sequelize;
}

//Connect with retry/backoff — containers race MySQL startup on first boot
async function connectWithRetry(sequelize, { retries = 10, delayMs = 3000 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await sequelize.authenticate();
      logger.info('Database connected');
      return;
    } catch (err) {
      logger.warn(`DB connection attempt ${attempt}/${retries} failed`, { error: err.message });
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

module.exports = { createSequelize, connectWithRetry, Sequelize };
