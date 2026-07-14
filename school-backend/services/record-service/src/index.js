'use strict';
process.env.PORT = process.env.PORT || 5003;

const { config, logger, db, server, redis } = require('../../../shared');
const sequelize = require('./config/database');
const app = require('./app');
const attendanceWorker = require('./workers/attendance.worker');

async function bootstrap() {
  await db.connectWithRetry(sequelize);
  await sequelize.sync();
  logger.info('Models synchronized');
  const worker = attendanceWorker.start();
  server.startServer(app, {
    port: config.port,
    serviceName: config.serviceName,
    onShutdown: async () => {
      await worker.close();
      await sequelize.close();
      await redis.getRedis().quit();
    },
  });
}

bootstrap().catch((err) => {
  logger.error('Fatal during bootstrap', { error: err.message, stack: err.stack });
  process.exit(1);
});
