'use strict';

const { getRedis } = require('./client');
const config = require('../config');
const logger = require('../logger');
const keys = require('./keys');

const DEFAULT_TTL = config.redis.cacheTtl;
const LIST_TTL = Number(process.env.CACHE_LIST_TTL_SECONDS) || 60;

/**
 * Cache-aside primitive. Returns the cached JSON if present, otherwise runs the
 * loader, caches the result and returns it.
 *
 * Cache problems are never allowed to fail a request: a read error falls
 * through to the loader, a write error is logged and swallowed.
 */
async function wrap(key, ttlSeconds, loader) {
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

/**
 * Cache one row by primary key.
 *   const student = await cache.byId(Student, id, () => Student.findByPk(id));
 */
function byId(model, id, loader, ttlSeconds = DEFAULT_TTL) {
  return wrap(keys.idKey(model, id), ttlSeconds, loader);
}

/**
 * Cache a paginated/filtered listing.
 *
 * Pass the RAW request query (`req.query`-shaped), not the built Sequelize
 * `where` — see the note in keys.js about Symbol keys collapsing search terms
 * into a single cache entry.
 *
 *   const page = await cache.list(Student, query, () => Student.findAndCountAll(...));
 */
function list(model, params, loader, ttlSeconds = LIST_TTL) {
  return wrap(keys.listKey(model, params), ttlSeconds, loader);
}

/**
 * Cache a derived view (report card, summary, aggregate). Stays inside the
 * entity's namespace, so it is invalidated automatically along with everything
 * else when the entity is written.
 *
 *   cache.derived(Grade, 'report', [studentId, term], loader)  -> grade:report:42:2025-T1
 */
function derived(model, name, parts, loader, ttlSeconds = DEFAULT_TTL) {
  return wrap(keys.derivedKey(model, name, parts), ttlSeconds, loader);
}

// ---------------------------------------------------------------------------
// Invalidation
// ---------------------------------------------------------------------------

// Coalesce identical in-flight pattern deletes. Bulk writes and concurrent
// requests hitting the same entity collapse into one SCAN sweep instead of N.
const inFlight = new Map();

/** Delete one key, or every key matching a glob pattern. Never throws. */
async function invalidate(pattern) {
  if (!pattern) return 0;
  if (!String(pattern).includes('*')) {
    try {
      return await unlink(getRedis(), [pattern]);
    } catch (err) {
      logger.warn('Cache invalidate failed', { pattern, error: err.message });
      return 0;
    }
  }

  if (inFlight.has(pattern)) return inFlight.get(pattern);

  const run = sweep(pattern)
    .catch((err) => {
      logger.warn('Cache invalidate failed', { pattern, error: err.message });
      return 0;
    })
    .finally(() => inFlight.delete(pattern));

  inFlight.set(pattern, run);
  return run;
}

async function sweep(pattern) {
  const redis = getRedis();
  let cursor = '0';
  let removed = 0;
  let iterations = 0;

  do {
    const [next, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 500);
    cursor = next;
    if (batch.length) removed += await unlink(redis, batch);
    // Safety valve: a pathological keyspace must not pin a request forever.
    if ((iterations += 1) > 10000) {
      logger.warn('Cache sweep hit the iteration cap', { pattern, removed });
      break;
    }
  } while (cursor !== '0');

  return removed;
}

/** UNLINK (non-blocking) where available, DEL otherwise. */
function unlink(redis, batch) {
  return typeof redis.unlink === 'function' ? redis.unlink(batch) : redis.del(batch);
}

/**
 * Drop everything cached for an entity, or just one row.
 *   cache.bust(Student)      -> student:*
 *   cache.bust(Student, 42)  -> student:42
 */
function bust(model, id) {
  return id === undefined
    ? invalidate(keys.entityPattern(model))
    : invalidate(keys.idKey(model, id));
}

module.exports = {
  wrap,
  byId,
  list,
  derived,
  invalidate,
  bust,
  DEFAULT_TTL,
  LIST_TTL,
};
