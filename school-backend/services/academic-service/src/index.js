`use strict`

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { config,logger,server,db,redis } = require('@school/shared');
const sequelize = require("./config/database"); 
const app = require('./app');

process.env.PORT = process.env.PORT || 5002

async function bootstrap(params) {
  await db.connectWithRetry(sequelize);

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
