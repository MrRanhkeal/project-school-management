'use strict';

/**
 * Manifest validator — the part that actually stops the mistakes.
 *
 * Cross-checks gateway/routes.manifest.js against:
 *   - itself            (duplicate paths, bad shapes, port collisions)
 *   - the service code  (every app.use('/api/...') mount)
 *   - .env              (declared port vs *_SERVICE_PORT)
 *
 * Exported as a function so both `gateway:build` and `gateway:check` use the
 * exact same rules.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** Pull every `app.use('<path>', ...)` mount out of a service's app.js. */
function mountedPaths(serviceName) {
  const appFile = path.join(ROOT, 'services', serviceName, 'src', 'app.js');
  if (!fs.existsSync(appFile)) return null; // service has no app.js — skip
  const src = fs.readFileSync(appFile, 'utf8');

  const mounts = [];
  // app.use('/api/students', studentRoutes)  /  app.use("/api/x", ...)  /  backticks
  const re = /app\.use\(\s*(['"`])([^'"`]+)\1/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const p = m[2];
    if (p.startsWith('/api/')) mounts.push(p);
  }
  return mounts;
}

/** Parse KEY=value pairs out of .env (best effort; missing file is fine). */
function readEnv() {
  const envFile = path.join(ROOT, '.env');
  const out = {};
  if (!fs.existsSync(envFile)) return out;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const isInternal = (p) => p.includes('/internal');

function validate(manifest) {
  const errors = [];
  const warnings = [];
  const env = readEnv();

  const seenPath = new Map(); // path -> service
  const seenPort = new Map(); // port -> service
  const seenName = new Set();

  for (const svc of manifest.services) {
    const where = `service "${svc.name}"`;

    // ---- shape ------------------------------------------------------------
    if (!svc.name) errors.push('a service entry is missing `name`');
    if (!svc.host) errors.push(`${where}: missing \`host\``);
    if (!Number.isInteger(svc.port)) errors.push(`${where}: \`port\` must be an integer`);
    if (!Array.isArray(svc.routes)) errors.push(`${where}: \`routes\` must be an array`);

    if (seenName.has(svc.name)) errors.push(`duplicate service name "${svc.name}"`);
    seenName.add(svc.name);

    if (seenPort.has(svc.port)) {
      errors.push(`port ${svc.port} is claimed by both "${seenPort.get(svc.port)}" and "${svc.name}"`);
    }
    seenPort.set(svc.port, svc.name);

    // ---- .env agreement ---------------------------------------------------
    if (svc.portEnv && env[svc.portEnv] && Number(env[svc.portEnv]) !== svc.port) {
      errors.push(
        `${where}: manifest port ${svc.port} != ${svc.portEnv}=${env[svc.portEnv]} in .env`
      );
    }
    if (svc.portEnv && !env[svc.portEnv]) {
      warnings.push(`${where}: ${svc.portEnv} is not set in .env`);
    }

    // ---- route shape + uniqueness ----------------------------------------
    const internalPrefixes = svc.internalPrefixes || [];
    for (const p of [...(svc.routes || []), ...internalPrefixes]) {
      if (!p.startsWith('/api/')) errors.push(`${where}: route "${p}" must start with /api/`);
      if (p.endsWith('/') && p !== '/') errors.push(`${where}: route "${p}" must not end with "/"`);
      if (seenPath.has(p)) {
        errors.push(`route "${p}" is claimed by both "${seenPath.get(p)}" and "${svc.name}"`);
      }
      seenPath.set(p, svc.name);
    }

    for (const p of svc.routes || []) {
      if (isInternal(p)) {
        errors.push(`${where}: "${p}" looks internal — put it in \`internalPrefixes\`, not \`routes\``);
      }
    }

    for (const p of Object.keys(svc.routeOptions || {})) {
      if (!(svc.routes || []).includes(p)) {
        errors.push(`${where}: routeOptions has "${p}" which is not in \`routes\``);
      }
    }

    // ---- code drift: manifest vs app.js ----------------------------------
    const mounts = mountedPaths(svc.name);
    if (mounts === null) {
      warnings.push(`${where}: no services/${svc.name}/src/app.js — skipped code cross-check`);
      continue;
    }

    const mountedPublic = mounts.filter((p) => !isInternal(p));
    const mountedInternal = mounts.filter(isInternal);

    for (const p of mountedPublic) {
      if (!(svc.routes || []).includes(p)) {
        errors.push(
          `${where}: "${p}" is mounted in app.js but missing from \`routes\` — ` +
            `it would 404 at the gateway. Add it to the manifest.`
        );
      }
    }
    for (const p of svc.routes || []) {
      if (!mountedPublic.includes(p)) {
        errors.push(
          `${where}: manifest exposes "${p}" but nothing mounts it in app.js — ` +
            `the gateway would proxy to a 404.`
        );
      }
    }
    for (const p of mountedInternal) {
      if (!internalPrefixes.includes(p)) {
        errors.push(
          `${where}: internal route "${p}" is mounted but not in \`internalPrefixes\` — ` +
            `it would be reachable from the public internet. Add it to the manifest.`
        );
      }
    }
    for (const p of internalPrefixes) {
      if (!mountedInternal.includes(p)) {
        warnings.push(`${where}: blocking "${p}" at the edge but nothing mounts it in app.js`);
      }
    }
  }

  // A typo'd internal prefix would leave the real internal path open. The
  // app.js cross-check above already catches that precisely (a mounted
  // /internal path missing from internalPrefixes is a hard error), so no
  // heuristic prefix-shadowing check is needed here.

  return { errors, warnings };
}

module.exports = { validate, mountedPaths, readEnv, ROOT };
