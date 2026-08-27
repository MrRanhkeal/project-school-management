'use strict';
require('dotenv').config();
const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../logger');
const { attachCacheHooks } = require('../redis/autoInvalidate');

/**
 * One pooled Sequelize connection per service process, sized so five services
 * cannot exhaust MySQL's max_connections at ~10k students of read/write load.
 *
 * Automatic cache invalidation is wired in HERE, on the connection, rather
 * than per model. That is deliberate: a model added by a future feature is
 * covered the moment it is defined, with no cache code of its own. Pass
 * `{ cache: false }` to opt a connection out.
 */
function createSequelize(overrides = {}) {
  const { cache = true, ...dbOverrides } = overrides;
  const db = { ...config.db, ...dbOverrides };

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

  attachCacheHooks(sequelize, { enabled: cache });

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
