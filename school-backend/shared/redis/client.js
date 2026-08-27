'use strict';

const Redis = require('ioredis');
const config = require('../config');
const logger = require('../logger');

// Lazily-created singleton Redis client shared across a service process.
// Used for cache-aside, rate limiting and (via BullMQ) job queues.

let client;

function getRedis() {
  if (client) return client;

  client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null, // required for BullMQ compatibility
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error('Redis error', { error: err.message }));

  return client;
}

module.exports = { getRedis };
