'use strict';

/**
 * `npm run cache:selftest` — proves the automatic invalidation actually fires.
 *
 * Runs entirely offline: an in-memory SQLite database stands in for MySQL and
 * a tiny in-memory fake stands in for Redis, so this is safe to run any time,
 * including in CI, with nothing else running.
 *
 * Requires sqlite3 (dev only):   npm i -D sqlite3
 */

const assert = require('assert');
const Module = require('module');

// ---------------------------------------------------------------------------
// Stand in for ioredis before anything requires it.
// ---------------------------------------------------------------------------
class FakeRedis {
  constructor() {
    this.store = new Map();
    this.ops = [];
  }
  on() {
    return this;
  }
  async get(k) {
    const v = this.store.get(k);
    return v === undefined ? null : v;
  }
  async set(k, v) {
    this.store.set(k, v);
    return 'OK';
  }
  async del(keys) {
    let n = 0;
    for (const k of [].concat(keys)) if (this.store.delete(k)) n += 1;
    return n;
  }
  async unlink(keys) {
    return this.del(keys);
  }
  async scan(cursor, _match, pattern, _count, count) {
    this.ops.push(pattern);
    const all = [...this.store.keys()];
    const start = Number(cursor);
    const page = all.slice(start, start + Number(count));
    const re = new RegExp(
      '^' +
        pattern
          .split('*')
          .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('.*') +
        '$'
    );
    const next = start + Number(count) >= all.length ? '0' : String(start + Number(count));
    return [next, page.filter((k) => re.test(k))];
  }
  async quit() {}
}

const realLoad = Module._load;
Module._load = function patched(request, parent, isMain) {
  if (request === 'ioredis') return FakeRedis;
  return realLoad(request, parent, isMain);
};

// ---------------------------------------------------------------------------

let Sequelize;
let DataTypes;
try {
  ({ Sequelize, DataTypes } = require('sequelize'));
  require.resolve('sqlite3');
} catch (err) {
  console.log('cache:selftest skipped — needs sqlite3 (npm i -D sqlite3)');
  process.exit(0);
}

const redis = require('../shared/redis');
const client = redis.getRedis();

let pass = 0;
let fail = 0;
const check = (name, fn) =>
  fn().then(
    () => {
      pass += 1;
      console.log(`  ok   ${name}`);
    },
    (err) => {
      fail += 1;
      console.log(`  FAIL ${name}\n       ${err.message}`);
    }
  );

const sequelize = new Sequelize('sqlite::memory:', { logging: false, define: { underscored: true } });
redis.attachCacheHooks(sequelize);

const Student = sequelize.define(
  'Student',
  { name: DataTypes.STRING },
  { tableName: 'students', cacheEntity: 'student', cacheDependents: ['class'] }
);
// Deliberately declares no cache config at all — stands in for a model a
// future feature adds without thinking about caching.
const Exam = sequelize.define('Exam', { title: DataTypes.STRING }, { tableName: 'exams' });

const SEED = [
  'student:1',
  'student:list:abc',
  'class:9',
  'class:list:xyz',
  'exam:1',
  'exam:list:z',
  'refresh:1:jti',
];
const seed = () => {
  client.store.clear();
  for (const k of SEED) client.store.set(k, '"cached"');
};
const keys = () => [...client.store.keys()];
const gone = (prefix) => !keys().some((k) => k.startsWith(prefix));

(async () => {
  await sequelize.sync();

  await check('a write clears the entity namespace and its declared dependents', async () => {
    seed();
    await Student.create({ name: 'a' });
    assert.ok(gone('student:'), 'student:* should be cleared');
    assert.ok(gone('class:'), 'class:* is a declared dependent and should be cleared');
    assert.ok(keys().includes('exam:1'), 'unrelated namespaces must be untouched');
  });

  await check('a model with no cache config is still covered', async () => {
    seed();
    await Exam.create({ title: 'midterm' });
    assert.ok(gone('exam:'));
  });

  await check('bulk writes sweep once, not once per row', async () => {
    seed();
    client.ops.length = 0;
    await Student.bulkCreate([{ name: 'x' }, { name: 'y' }, { name: 'z' }]);
    assert.ok(gone('student:'));
    const sweeps = client.ops.filter((p) => p === 'student:*').length;
    assert.ok(sweeps <= 2, `expected at most 2 sweeps, saw ${sweeps}`);
  });

  await check('Model.update() / Model.destroy() (bulk hook signature) are covered', async () => {
    seed();
    await Student.update({ name: 'q' }, { where: {} });
    assert.ok(gone('student:'));
    seed();
    await Student.destroy({ where: {} });
    assert.ok(gone('student:'));
  });

  await check('session keys (refresh:*) are never swept by a profile write', async () => {
    seed();
    await Student.create({ name: 'c' });
    assert.ok(keys().includes('refresh:1:jti'));
  });

  await check('invalidation waits for COMMIT', async () => {
    seed();
    await sequelize.transaction(async (tx) => {
      await Student.create({ name: 'tx' }, { transaction: tx });
      assert.ok(keys().includes('student:1'), 'cache must stay warm mid-transaction');
    });
    await new Promise((r) => setImmediate(r));
    assert.ok(gone('student:'), 'cache must be cleared after commit');
  });

  await check('a rolled-back write does not clear the cache', async () => {
    seed();
    await sequelize
      .transaction(async (tx) => {
        await Student.create({ name: 'nope' }, { transaction: tx });
        throw new Error('rollback');
      })
      .catch(() => {});
    await new Promise((r) => setImmediate(r));
    assert.ok(keys().includes('student:1'));
  });

  await check('a Redis outage never fails the write', async () => {
    seed();
    const realScan = client.scan;
    client.scan = async () => {
      throw new Error('ECONNREFUSED');
    };
    await Student.create({ name: 'during outage' });
    client.scan = realScan;
  });

  await check('list keys are order-independent and Symbol-aware', async () => {
    assert.strictEqual(
      redis.listKey(Student, { page: 1, q: 'a' }),
      redis.listKey(Student, { q: 'a', page: 1 })
    );
    const { Op } = Sequelize;
    const a = { level: 'primary', [Op.or]: [{ name: 'john' }] };
    const b = { level: 'primary', [Op.or]: [{ name: 'mary' }] };
    assert.strictEqual(JSON.stringify(a), JSON.stringify(b)); // the old bug
    assert.notStrictEqual(redis.listKey(Student, a), redis.listKey(Student, b)); // fixed
  });

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
})();
