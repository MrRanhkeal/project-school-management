'use strict';

module.exports = {
  ...require('./auth'),
  ...require('./internalAuth'),
  errorHandler: require('./error'),
  notFound: require('./notFound'),
  requestLogger: require('./requestLogger'),
  rateLimiter: require('./rateLimiter'),
  validate: require('./validate'),
};
