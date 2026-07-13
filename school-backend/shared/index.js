'use strict';

 // Single entry point for the shared library.
 // Usage: const { logger, config, ApiError, ... } = require('@school/shared');

module.exports = {
  config: require('./config'),
  logger: require('./logger'),
  ...require('./utils'),
  ...require('./middleware'),
  redis: require('./redis'),
  db: require('./db'),
  server: require('./server'),
  queue: require('./queue'),
};
