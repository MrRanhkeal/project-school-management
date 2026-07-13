'use strict';

const Redis = require('ioredis');
const config = require('../config');
const logger = require('../logger');

//Lazily-created singleton Redis client shared across a service process.
//Used for cache-aside, rate limiting and (via BullMQ) job queues.

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

//Cache-aside helper: returns cached JSON if present, otherwise runs the loader, caches the result and returns it.
async function cacheWrap(key, ttlSeconds, loader) {
  const redis = getRedis();
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit);
  } catch (err) {
    logger.warn('Cache read failed, falling through to loader', { key, error: err.message });
  }

  const value = await loader();
  if (value !== undefined && value !== null) {
    redis
      .set(key, JSON.stringify(value), 'EX', ttlSeconds)
      .catch((err) => logger.warn('Cache write failed', { key, error: err.message }));
  }
  return value;
}

/** Invalidate one or many keys (accepts a glob pattern via SCAN). */
async function invalidate(pattern) {
  const redis = getRedis();
  if (!pattern.includes('*')) return redis.del(pattern);

  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    if (keys.length) await redis.del(keys);
  } while (cursor !== '0');
}

module.exports = { getRedis, cacheWrap, invalidate };
