'use strict';

const logger = require('../logger');

// Lightweight access log with latency. Skips health checks to reduce noise
module.exports = function requestLogger(req, res, next) {
  if (req.path === '/health' || req.path === '/healthz') return next();

  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms * 10) / 10,
    });
  });
  next();
};
