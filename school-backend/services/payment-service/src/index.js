
`use stric`;

const { config, logger, db, server, redis } = require('@school/shared');
const { sequelize } = require('./config/database');
const app = require('./app');

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