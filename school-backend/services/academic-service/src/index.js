`use strict`

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { config, logger, server, db, redis } = require('@school/shared');
const sequelize = require("./config/database");
const app = require('./app');

process.env.PORT = process.env.PORT || 5002

async function bootstrap(params) {
  await db.connectWithRetry(sequelize);

  // Schema is owned by migrations (`npm run db:migrate`), NOT by sync().
  // sync() only ever CREATEs missing tables — it will not add a column or
  // change a type on a table that already exists, so it silently drifts from
  // the models. Set DB_SYNC=true only for a throwaway local scratch database.
  if (process.env.DB_SYNC === 'true') {
    await sequelize.sync();
    logger.warn('sequelize.sync() ran - DB_SYNC=true. Do not use this outside local scratch work.');
  }

  server.startServer(app, {
    port: config.port,
    serviceName: config.serviceName,
    onShutdown: async () => {
      await sequelize.close();
      await redis.getRedis().quit();
    },
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal during bootstrap', { error: err.message, stack: err.stack });
  process.exit(1);
});
