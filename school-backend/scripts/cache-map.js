'use strict';

/**
 * `npm run cache:map` — print what every model invalidates, so automatic
 * invalidation is inspectable rather than magic.
 *
 * Loads each service's models WITHOUT connecting to MySQL or Redis (Sequelize
 * only dials on the first query), then reports the derived cache namespaces.
 */

const path = require('path');
const fs = require('fs');
const { entityOf } = require('../shared/redis/keys');
const { patternsFor } = require('../shared/redis/autoInvalidate');

const ROOT = path.resolve(__dirname, '..');

// service -> the module that defines/loads its models
const ENTRYPOINTS = {
  'auth-service': 'src/models/user.model.js',
  'academic-service': 'src/models/index.js',
  'record-service': 'src/models',
  'payment-service': 'src/models/payment.model.js',
};

function loadModels(service, entry) {
  const dir = path.join(ROOT, 'services', service);
  const target = path.join(dir, entry);
  if (!fs.existsSync(target)) return [];

  if (fs.statSync(target).isDirectory()) {
    // record-service has no models/index.js — require each model file.
    return fs
      .readdirSync(target)
      .filter((f) => f.endsWith('.js'))
      .map((f) => require(path.join(target, f)))
      .filter((m) => m && m.name);
  }

  const mod = require(target);
  const candidates = mod && mod.name ? [mod] : Object.values(mod || {});
  return candidates.filter((m) => m && m.name && m.options && typeof m.findAll === 'function');
}

let failed = false;
const seen = new Map(); // entity -> "service.Model"

for (const [service, entry] of Object.entries(ENTRYPOINTS)) {
  let models;
  try {
    models = loadModels(service, entry);
  } catch (err) {
    // Not a failure: this is a read-only report, and a service whose deps are
    // not installed yet should not break `npm run verify`.
    console.warn(`  warn  ${service}: could not load models — ${err.message}`);
    continue;
  }

  console.log(`\n${service}`);
  if (!models.length) {
    console.log('    (no models)');
    continue;
  }

  for (const model of models) {
    const entity = entityOf(model);
    const patterns = patternsFor(model);
    console.log(`    ${model.name.padEnd(12)} -> ${entity}:*`);
    const extra = patterns.filter((p) => p !== `${entity}:*`);
    if (extra.length) console.log(`    ${''.padEnd(12)}    also clears ${extra.join(', ')}`);

    const key = `${service}:${entity}`;
    if (seen.has(key)) {
      console.error(`  ✗ ${service}: entity "${entity}" claimed by both ` +
        `${seen.get(key)} and ${model.name} — set a distinct cacheEntity`);
      failed = true;
    }
    seen.set(key, model.name);
  }
}

console.log('');
process.exit(failed ? 1 : 0);
