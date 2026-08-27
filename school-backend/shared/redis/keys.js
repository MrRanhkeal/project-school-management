'use strict';

/**
 * Cache key conventions.
 *
 * Every key for an entity lives under the `<entity>:` namespace:
 *
 *   student:42                      one row
 *   student:list:<hash>             a paginated/filtered listing
 *   grade:report:42:2025-T1         a derived/computed view
 *
 * That single rule is what makes automatic invalidation possible: busting
 * `student:*` provably clears every cached thing derived from students, so
 * nobody has to remember which keys a new feature introduced.
 *
 * Keys are always built FROM THE MODEL, never from a hand-typed string, so the
 * read path and the invalidation path can never drift apart.
 */

const crypto = require('crypto');

/**
 * Entity name for a Sequelize model (or a plain string, for the rare case
 * where there is no model behind the cache).
 *
 * Defaults to the lowercased model name. Override per model with
 * `{ cacheEntity: 'teacher' }` in the define() options when the model name and
 * the desired namespace differ (e.g. model `Teachers` -> `teacher:`).
 */
function entityOf(model) {
  if (!model) throw new Error('cache: a model or entity name is required');
  if (typeof model === 'string') return model;
  const override = model.options && model.options.cacheEntity;
  if (override) return override;
  const name = model.name || (model.constructor && model.constructor.name);
  if (!name) throw new Error('cache: could not derive an entity name from the given model');
  return String(name).toLowerCase();
}

/**
 * Deterministic JSON: object keys sorted, undefined dropped, Symbol keys
 * (Sequelize's Op.or and friends) rendered rather than silently discarded.
 *
 * This matters: `JSON.stringify` drops Symbol-keyed properties entirely, so
 * building a list key from a Sequelize `where` object collapses every
 * different search into the SAME key and serves one user's results to another.
 * Build list keys from the raw request query and this stays a non-issue.
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const parts = [];
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${stableStringify(value[key])}`);
  }
  for (const sym of Object.getOwnPropertySymbols(value).sort((a, b) =>
    String(a).localeCompare(String(b))
  )) {
    parts.push(`${JSON.stringify(String(sym))}:${stableStringify(value[sym])}`);
  }
  return `{${parts.join(',')}}`;
}

/** Short, collision-safe digest of any params object. */
function fingerprint(params) {
  return crypto.createHash('sha1').update(stableStringify(params)).digest('hex').slice(0, 16);
}

/** `student:42` */
const idKey = (model, id) => `${entityOf(model)}:${id}`;

/** `student:list:<hash-of-query>` */
const listKey = (model, params = {}) => `${entityOf(model)}:list:${fingerprint(params)}`;

/** `grade:report:42:2025-T1` — a named view derived from the entity. */
function derivedKey(model, name, parts = []) {
  // null / undefined / '' all collapse to `all`, so an omitted filter and an
  // empty one share a cache entry instead of quietly forking into two.
  const tail = (Array.isArray(parts) ? parts : [parts]).map((p) =>
    p === null || p === undefined || p === '' ? 'all' : p
  );
  return [entityOf(model), name, ...tail].join(':');
}

/** `student:*` — everything cached for this entity. */
const entityPattern = (model) => `${entityOf(model)}:*`;

module.exports = {
  entityOf,
  stableStringify,
  fingerprint,
  idKey,
  listKey,
  derivedKey,
  entityPattern,
};
