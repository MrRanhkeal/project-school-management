'use strict'; //error handling middleware for express routes

const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils');

//Verify a Bearer access token and attach the decoded payload to req.user.
function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

//Role guard. Usage: router.post('/', authenticate, authorize('admin','teacher'), handler)
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
