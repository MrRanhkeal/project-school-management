'use strict';

const winston = require('winston');

const serviceName = process.env.SERVICE_NAME || 'service';
const level = process.env.LOG_LEVEL || 'info';

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(
    ({ timestamp, level: lvl, message, ...meta }) =>
      `${timestamp} [${serviceName}] ${lvl}: ${message}` +
      (Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '')
  )
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level,
  defaultMeta: { service: serviceName },
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

module.exports = logger;
