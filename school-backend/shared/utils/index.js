'use strict';

class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = 'Bad request', details) {
    return new ApiError(400, msg, details);
  }

  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }

  static internal(msg = 'Internal server error') {
    return new ApiError(500, msg);
  } 
}

 // Wrap async route handlers.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

//success res
const ok = (res, data = null, meta = undefined, status = 200) => {
  return res.status(status).json({
    success: true,
    message: 'Request successful',
    data,
    ...(meta && { meta })
  });
};

//error res
const fail = (res, status = 500, message = 'Something went wrong', details = undefined) => {
  return res.status(status).json({
    success: false,
    message,
    ...(details && { details })
  });
};


 //Parse pagination.

const paginate = (
  query,
  {
    defaultLimit = 20,
    maxLimit = 100
  } = {}
) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit, 10) || defaultLimit)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};


//Pagination metadata.
const pageMeta = (total, { page, limit }) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit) || 1
});

module.exports = { ApiError, asyncHandler, ok, fail, paginate, pageMeta };