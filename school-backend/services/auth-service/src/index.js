'use strict'; //easy debugging and error handling

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { config, logger, db, server, redis } = require('@school/shared');
const sequelize = require('./config/db');
const app = require('./app');

async function bootstrap() {
  await db.connectWithRetry(sequelize);

  // In production prefer migrations; sync is convenient for first boot/dev.
  await sequelize.sync();
  logger.info('Models synchronized');

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
