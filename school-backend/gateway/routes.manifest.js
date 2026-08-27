'use strict';

/**
 * ============================================================================
 * GATEWAY ROUTE MANIFEST — the single source of truth for public routing.
 * ============================================================================
 *
 * Adding a new feature? Do these two things and nothing else:
 *
 *   1. Mount it in the service:   app.use('/api/exams', examRoutes)
 *   2. Add the path here:         routes: [..., '/api/exams']
 *
 * Then run `npm run gateway:build` (or just `npm run up`, which does it for
 * you). `npm run gateway:check` fails the build if code and manifest disagree,
 * so a route can never silently miss the gateway again.
 *
 * Rules the checker enforces (see gateway/validate.js):
 *   - every public `app.use('/api/...')` in a service must appear in `routes`
 *   - every path in `routes` must actually be mounted in that service
 *   - every `.../internal` mount must appear in `internalPrefixes` so it is
 *     403'd at the edge and only reachable inside the docker network
 *   - no two services may claim the same path
 *   - `port` must match the matching *_SERVICE_PORT in .env
 */

module.exports = {
  // --- Gateway-wide settings -------------------------------------------------
  gateway: {
    listen: 80,
    clientMaxBodySize: '2m',
    // The zone is always declared; `enabled: true` is what actually applies
    // `limit_req` to each location. Left off so the gateway keeps behaving
    // exactly as it did before — flip it on once you have watched the rate a
    // real classroom generates, and tune `burst` per route below.
    rateLimit: { zone: 'api_limit', size: '10m', rate: '50r/s', enabled: false, burst: 20 },
    proxy: { connectTimeout: '5s', readTimeout: '30s', sendTimeout: '30s' },
  },

  // --- Services --------------------------------------------------------------
  // host          docker-compose service name (resolved by docker DNS)
  // port          container port; must equal <NAME>_SERVICE_PORT in .env
  // internalPrefixes  service-to-service paths, blocked with 403 at the edge
  // routes        public paths proxied to this service
  // routeOptions  optional per-path overrides (body size / timeouts)
  services: [
    {
      name: 'auth-service',
      host: 'auth-service',
      port: 4001,
      portEnv: 'AUTH_SERVICE_PORT',
      internalPrefixes: ['/api/auth/internal'],
      routes: ['/api/auth'],
    },

    {
      name: 'academic-service',
      host: 'academic-service',
      port: 4002,
      portEnv: 'ACADEMIC_SERVICE_PORT',
      internalPrefixes: ['/api/academic/internal'],
      routes: [
        '/api/students',
        '/api/teachers',
        '/api/classes',
        '/api/courses',
        '/api/enrollments',
      ],
    },

    {
      name: 'record-service',
      host: 'record-service',
      port: 4003,
      portEnv: 'RECORD_SERVICE_PORT',
      internalPrefixes: [],
      routes: ['/api/grades', '/api/attendance'],
      routeOptions: {
        // A full class roll is one request; give it room and time.
        '/api/attendance': { clientMaxBodySize: '5m', readTimeout: '60s' },
      },
    },

    {
      name: 'payment-service',
      host: 'payment-service',
      port: 4004,
      portEnv: 'PAYMENT_SERVICE_PORT',
      internalPrefixes: ['/api/payments/internal'],
      routes: ['/api/payments'],
      routeOptions: {
        // Bakong round trips are slower than a local DB read.
        '/api/payments': { readTimeout: '45s' },
      },
    },

    {
      name: 'notification-service',
      host: 'notification-service',
      port: 4005,
      portEnv: 'NOTIFICATION_SERVICE_PORT',
      internalPrefixes: ['/api/notifications/internal'],
      routes: ['/api/notifications'],
    },
  ],
};
