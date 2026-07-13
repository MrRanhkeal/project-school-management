'use strict';

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const logger = require('../logger');
const { errorHandler, notFound, requestLogger } = require('../middleware');


 //Create a pre-wired Express app with the common middleware stack so every
 //service is configured identically (security headers, gzip, body limits, access logging). Routes and the error handler are attached by the caller via the `routes` callback.
function createApp({ serviceName, routes }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true); // behind nginx 

  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(requestLogger);

  // Liveness/readiness probe used by Docker healthchecks and nginx.
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: serviceName, ts: new Date().toISOString() })
  );

  if (typeof routes === 'function') routes(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

 // Start the HTTP server and wire graceful shutdown so in-flight requests drain
 // and DB/Redis pools close cleanly on SIGTERM (Docker stop).

function startServer(app, { port, serviceName, onShutdown }) {
  const server = app.listen(port, () =>
    logger.info(`${serviceName} listening on :${port}`)
  );

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      try {
        if (onShutdown) await onShutdown();
      } finally {
        process.exit(0);
      }
    });
    // Force-exit if connections refuse to close.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  ['SIGTERM', 'SIGINT'].forEach((sig) => process.on(sig, () => shutdown(sig)));
  process.on('unhandledRejection', (reason) =>
    logger.error('Unhandled rejection', { reason: String(reason) })
  );

  return server;
}

module.exports = { createApp, startServer };
