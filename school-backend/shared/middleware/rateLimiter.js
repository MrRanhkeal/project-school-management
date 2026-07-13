'use strict';

const config = require('../config');
const { getRedis } = require('../redis');
const { ApiError } = require('../utils');
const logger = require('../logger');

//Distributed fixed-window rate limiter backed by Redis so the limit holds 
module.exports = function rateLimiter(opts = {}) {
  const windowMs = opts.windowMs || config.rateLimit.windowMs;
  const max = opts.max || config.rateLimit.max;
  const keyPrefix = opts.keyPrefix || 'rl';
  const windowSec = Math.ceil(windowMs / 1000);

  return async function (req, res, next) {
    const id = req.user?.sub || req.ip;
    const key = `${keyPrefix}:${config.serviceName}:${id}`;
    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, windowSec);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count));

      if (count > max) {
        return next(new ApiError(429, 'Too many requests, slow down'));
      }
      return next();
    } catch (err) {
      logger.warn('Rate limiter bypassed (redis error)', { error: err.message });
      return next(); // fail open
    }
  };
};
