'use strict';

/**
 * Shared Redis surface.
 *
 * Preferred API (keys derived from the model, so reads and invalidation can
 * never drift apart):
 *
 *     const { redis } = require('@school/shared');
 *     redis.byId(Student, id, loader)
 *     redis.list(Student, req.query, loader)
 *     redis.derived(Grade, 'report', [studentId, term], loader)
 *
 * Invalidation is automatic — see shared/redis/autoInvalidate.js. You should
 * not need to call `bust`/`invalidate` from service code; if you find yourself
 * wanting to, add a `cacheDependents` entry to the model instead.
 */

const { getRedis } = require('./client');
const keys = require('./keys');
const cache = require('./cache');
const { attachCacheHooks, describe, patternsFor } = require('./autoInvalidate');

module.exports = {
  getRedis,

  // key builders
  ...keys,

  // cache-aside helpers
  wrap: cache.wrap,
  byId: cache.byId,
  list: cache.list,
  derived: cache.derived,

  // manual invalidation (rarely needed — hooks handle the normal cases)
  invalidate: cache.invalidate,
  bust: cache.bust,

  // wiring + introspection
  attachCacheHooks,
  describeCache: describe,
  patternsFor,

  /** @deprecated use `redis.byId` / `redis.list` / `redis.derived`. */
  cacheWrap: cache.wrap,
};
