'use strict';

/**
 * ============================================================================
 * AUTOMATIC CACHE INVALIDATION
 * ============================================================================
 *
 * Registers GLOBAL Sequelize hooks on a connection, so every model — including
 * models a future feature has not written yet — invalidates its own cache
 * namespace on every write. Nothing to remember, nothing to wire up.
 *
 * How it works:
 *   - every cache key lives under `<entity>:` (see keys.js)
 *   - any write to a model busts `<entity>:*`
 *   - `cacheDependents` on a model busts other namespaces that embed it
 *
 * Because the hooks are registered on the *connection* rather than on each
 * model, a model defined later is covered automatically. Adding
 * `models/exam.model.js` needs zero cache code.
 *
 * Declaring a dependency (in the model's define() options):
 *
 *     sequelize.define('Student', { ... }, {
 *       tableName: 'students',
 *       cacheEntity: 'student',            // namespace override (optional)
 *       cacheDependents: ['class'],        // class:<id> embeds student rows
 *     });
 *
 * Scope: this only clears caches in the SAME Redis namespace as the writer.
 * Cross-service copies (e.g. record-service caching a student name it fetched
 * over HTTP from academic-service) still expire on their own TTL — that is by
 * design, services do not reach into each other's cache.
 */

const logger = require('../logger');
const cache = require('./cache');
const { entityOf, entityPattern } = require('./keys');

// Hooks whose first argument is the instance (or array of instances).
// `afterSave` is deliberately absent: it fires alongside afterCreate/afterUpdate
// and would only trigger a second, identical sweep.
const INSTANCE_HOOKS = [
  'afterCreate',
  'afterUpdate',
  'afterDestroy',
  'afterRestore',
  'afterUpsert',
  'afterBulkCreate',
];

// Hooks that receive ONLY an options object — the model is on `options.model`.
const OPTIONS_ONLY_HOOKS = ['afterBulkUpdate', 'afterBulkDestroy', 'afterBulkRestore'];

/** Looks like a Sequelize Model class rather than a plain object. */
const isModel = (m) => Boolean(m && m.name && m.options && typeof m.findAll === 'function');

/** Best-effort model resolution across the differing hook signatures. */
function resolveModel(first) {
  if (!first) return null;
  // afterBulkCreate passes an array; afterUpsert passes [instance, created].
  if (Array.isArray(first)) return resolveModel(first[0]);
  return isModel(first.constructor) ? first.constructor : null;
}

/** All namespaces a write to `model` should clear. */
function patternsFor(model) {
  const patterns = [entityPattern(model)];
  const dependents = (model.options && model.options.cacheDependents) || [];
  for (const dep of dependents) patterns.push(`${entityOf(dep)}:*`);
  return [...new Set(patterns)];
}

/**
 * Clear the patterns. If the write is inside a transaction, wait for COMMIT so
 * a rolled-back write does not throw away a valid cache, and a concurrent read
 * cannot repopulate the cache from a snapshot that never existed.
 */
function flush(model, options) {
  const patterns = patternsFor(model);
  const run = () =>
    Promise.all(patterns.map((p) => cache.invalidate(p))).catch((err) =>
      // cache.invalidate already swallows its own errors; this is belt-and-braces
      // so a cache problem can never fail the write that triggered it.
      logger.warn('Automatic cache invalidation failed', {
        entity: entityOf(model),
        error: err.message,
      })
    );

  const tx = options && options.transaction;
  if (tx && typeof tx.afterCommit === 'function') {
    tx.afterCommit(run);
    return undefined; // do not block the transaction
  }
  return run();
}

/**
 * Attach the global hooks to a Sequelize connection. Idempotent.
 * Opt out for a connection with `attachCacheHooks(sequelize, { enabled: false })`.
 */
function attachCacheHooks(sequelize, { enabled = true } = {}) {
  if (!sequelize || !enabled) return sequelize;
  if (sequelize.__cacheHooksAttached) return sequelize;
  sequelize.__cacheHooksAttached = true;

  const safe = (fn) => (...args) => {
    try {
      return fn(...args);
    } catch (err) {
      logger.warn('Cache hook threw', { error: err.message });
      return undefined;
    }
  };

  for (const hook of INSTANCE_HOOKS) {
    sequelize.addHook(
      hook,
      safe((first, options) => {
        const model = resolveModel(first);
        if (!model) return undefined;
        return flush(model, options);
      })
    );
  }

  for (const hook of OPTIONS_ONLY_HOOKS) {
    sequelize.addHook(
      hook,
      safe((options) => {
        const model = options && options.model;
        if (!model) return undefined;
        return flush(model, options);
      })
    );
  }

  logger.info('Automatic cache invalidation enabled');
  return sequelize;
}

/**
 * Introspection helper — `npm run cache:map` prints what each model clears, so
 * the behaviour is visible rather than magic.
 */
function describe(sequelize) {
  return Object.values(sequelize.models).map((model) => ({
    model: model.name,
    entity: entityOf(model),
    clears: patternsFor(model),
  }));
}

module.exports = { attachCacheHooks, describe, patternsFor };
