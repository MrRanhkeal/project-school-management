'use strict';

//Centralized, validated configuration loaded from environment variables

const toInt = (v, d) => (v === undefined || v === '' ? d : parseInt(v, 10));

const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  serviceName: process.env.SERVICE_NAME || 'service',
  port: toInt(process.env.PORT, 4000),
  logLevel: process.env.LOG_LEVEL || 'info',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '7h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  db: { 
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'auth_db',
    user: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'app_secret',
    pool: {
      max: toInt(process.env.DB_POOL_MAX, 20),
      min: toInt(process.env.DB_POOL_MIN, 2),
      idle: toInt(process.env.DB_POOL_IDLE, 10000),
      acquire: toInt(process.env.DB_POOL_ACQUIRE, 30000),
    },
  },

  // Service-to-service (internal) communication
  services: {
    // URL other services use to reach auth-service on the docker network
    authUrl: process.env.AUTH_SERVICE_URL || 'http://auth-service:4001',
    // URL other services use to reach academic-service on the docker network
    academicUrl: process.env.ACADEMIC_SERVICE_URL || 'http://academic-service:4002',
    // URL other services use to reach payment-service on the docker network
    paymentUrl: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:4004',
    // URL other services use to reach record-service on the docker network
    recordUrl: process.env.RECORD_SERVICE_URL || 'http://record-service:4003',
    // URL other services use to reach notification-service on the docker network
    notificationUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:4005',
    // Shared secret sent as `x-internal-token` on internal endpoints
    internalToken: process.env.INTERNAL_SERVICE_TOKEN || 'dev_internal_token',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    cacheTtl: toInt(process.env.CACHE_TTL_SECONDS, 300),
  },

  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    max: toInt(process.env.RATE_LIMIT_MAX, 120),
  },
};

module.exports = config;
