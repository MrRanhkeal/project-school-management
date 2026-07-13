'use strict';

const logger = require('../logger');
const { ApiError } = require('../utils'); 

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Internal server error';
  let details;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    status = 409;
    message = 'Resource already exists';
    details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeValidationError') {
    status = 400;
    message = 'Validation failed';
    details = err.errors?.map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    status = 400;
    message = 'Referenced resource does not exist';
  }

  if (status >= 500) {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });
  }

  res.status(status).json({
    success: false,
    error: { message, ...(details ? { details } : {}) },
  });
};
