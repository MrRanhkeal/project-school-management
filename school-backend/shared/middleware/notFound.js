'use strict';

const { ApiError } = require('../utils');

//Catch-all for unmatched routes -> 404 ApiError
module.exports = function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};
