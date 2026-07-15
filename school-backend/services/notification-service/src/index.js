'use strict';

const { config, logger, server, queue, redis } = require('@school/shared');
const app = require('./app');
const { dispatch } = require('./dispatcher');

async function bootstrap() {
    // In-process consumer for the 'notification' queue (fed by attendance-worker
    // and the /send endpoint). Higher concurrency since work is I/O-bound.
    const worker = queue.createWorker('notification', async (job) => dispatch(job.data), {
        concurrency: 50,
    });
    logger.info('Notification worker consuming queue');

    // HTTP API for ad-hoc sends + history.
    server.startServer(app, {
        port: config.port,
        serviceName: config.serviceName,
        onShutdown: async () => {
            await worker.close();
            await redis.getRedis().quit();
        },
    });
}

bootstrap().catch((err) => {
    logger.error('Notification bootstrap failed', { error: err.message, stack: err.stack });
    process.exit(1);
});
