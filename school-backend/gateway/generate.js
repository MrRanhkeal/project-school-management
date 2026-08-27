'use strict';

/**
 * Renders nginx/nginx.conf from gateway/routes.manifest.js + nginx.conf.tmpl.
 *
 *   node gateway/generate.js            write nginx/nginx.conf
 *   node gateway/generate.js --check    exit 1 if the file on disk is stale
 *
 * The rendered file carries a DO-NOT-EDIT banner: edit the manifest (routing)
 * or the template (nginx tuning), never the output.
 */

const fs = require('fs');
const path = require('path');
const manifest = require('./routes.manifest');
const { validate, ROOT } = require('./validate');

const TEMPLATE = path.join(__dirname, 'nginx.conf.tmpl');
const OUTPUT = path.join(ROOT, 'nginx', 'nginx.conf');

const BANNER = [
  '# =========================================================================',
  '#  GENERATED FILE — DO NOT EDIT BY HAND.',
  '#  Source:     gateway/routes.manifest.js  (routing)',
  '#              gateway/nginx.conf.tmpl     (nginx tuning)',
  '#  Regenerate: npm run gateway:build',
  '#  Verify:     npm run gateway:check',
  '#  Any manual edit here is overwritten on the next build.',
  '# =========================================================================',
  '',
].join('\n');

/** auth-service -> auth_service (a valid nginx upstream name). */
const upstreamName = (svc) => svc.name.replace(/[^a-zA-Z0-9]+/g, '_');

function renderUpstreams() {
  const width = Math.max(...manifest.services.map((s) => upstreamName(s).length));
  return manifest.services
    .map((s) => {
      const n = upstreamName(s).padEnd(width);
      return `    upstream ${n} { server ${s.host}:${s.port}; }`;
    })
    .join('\n');
}

function renderLocations() {
  const out = [];

  for (const svc of manifest.services) {
    const up = upstreamName(svc);
    out.push(`        # ---- ${svc.name} (${svc.host}:${svc.port}) ----`);

    for (const ip of svc.internalPrefixes || []) {
      out.push(`        # service-to-service only; never reachable from outside docker`);
      out.push(`        location ${ip} {`);
      out.push(`            return 403 '{"error":"forbidden"}';`);
      out.push(`        }`);
    }

    for (const route of svc.routes || []) {
      const opts = (svc.routeOptions || {})[route] || {};
      const rl = manifest.gateway.rateLimit;
      out.push(`        location ${route} {`);
      if (rl.enabled) {
        out.push(`            limit_req zone=${rl.zone} burst=${opts.burst || rl.burst || 20} nodelay;`);
      }
      if (opts.clientMaxBodySize) out.push(`            client_max_body_size ${opts.clientMaxBodySize};`);
      if (opts.readTimeout) out.push(`            proxy_read_timeout ${opts.readTimeout};`);
      if (opts.sendTimeout) out.push(`            proxy_send_timeout ${opts.sendTimeout};`);
      out.push(`            proxy_pass http://${up};`);
      out.push(`        }`);
    }

    out.push('');
  }

  return out.join('\n');
}

function render() {
  const g = manifest.gateway;
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');

  const body = tpl
    .replace('{{RATE_LIMIT_ZONE}}', g.rateLimit.zone)
    .replace('{{RATE_LIMIT_SIZE}}', g.rateLimit.size)
    .replace('{{RATE_LIMIT_RATE}}', g.rateLimit.rate)
    .replace('{{PROXY_CONNECT_TIMEOUT}}', g.proxy.connectTimeout)
    .replace('{{PROXY_READ_TIMEOUT}}', g.proxy.readTimeout)
    .replace('{{PROXY_SEND_TIMEOUT}}', g.proxy.sendTimeout)
    .replace('{{LISTEN}}', String(g.listen))
    .replace('{{CLIENT_MAX_BODY_SIZE}}', g.clientMaxBodySize)
    .replace('{{UPSTREAMS}}', renderUpstreams())
    .replace('{{LOCATIONS}}', renderLocations());

  const left = body.match(/\{\{[A-Z_]+\}\}/g);
  if (left) throw new Error(`template placeholder(s) not substituted: ${left.join(', ')}`);

  return BANNER + body;
}

function main() {
  const check = process.argv.includes('--check');

  const { errors, warnings } = validate(manifest);
  warnings.forEach((w) => console.warn(`  warn  ${w}`));
  if (errors.length) {
    console.error('\nGateway manifest is invalid:\n');
    errors.forEach((e) => console.error(`  ✗ ${e}`));
    console.error('\nFix gateway/routes.manifest.js (or the service that drifted) and re-run.\n');
    process.exit(1);
  }

  const next = render();
  const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : null;

  // Compare newline-insensitively: git's autocrlf hands Windows checkouts a
  // CRLF copy of a file this script writes with LF, and that must not read as
  // "stale" forever.
  const same = current !== null && current.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n');

  if (check) {
    if (!same) {
      console.error('\n✗ nginx/nginx.conf is out of date with gateway/routes.manifest.js.');
      console.error('  Run `npm run gateway:build` and commit the result.\n');
      process.exit(1);
    }
    const routeCount = manifest.services.reduce((n, s) => n + s.routes.length, 0);
    console.log(`✓ gateway in sync — ${manifest.services.length} services, ${routeCount} public routes`);
    return;
  }

  if (same) {
    console.log('✓ nginx/nginx.conf already up to date');
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, next);
  console.log(`✓ wrote ${path.relative(ROOT, OUTPUT)}`);
  for (const svc of manifest.services) {
    console.log(`    ${svc.name.padEnd(22)} ${svc.routes.join(', ') || '(none)'}`);
  }
}

if (require.main === module) main();

module.exports = { render, OUTPUT };
