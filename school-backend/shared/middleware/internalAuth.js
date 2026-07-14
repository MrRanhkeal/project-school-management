'use strict';

const config = require('../config');
const { ApiError } = require('../utils');

/**
 * Guard for service-to-service (internal) endpoints.
 * Callers must send the shared secret in the `x-internal-token` header.
 * These routes are additionally blocked at the nginx gateway, so only
 * services on the docker network can reach them.
 */
function internalAuth(req, _res, next) {
  const token = req.headers['x-internal-token'];
  if (!token || token !== config.services.internalToken) {
    return next(ApiError.forbidden('Internal endpoint'));
  }
  return next();
}

module.exports = { internalAuth };
