'use strict';
require('dotenv').config();

// Mirrors shared/db/createSequelize() so the CLI talks to the same DB,
// with the same naming/charset rules, as the running service.
const base = {
    username: process.env.DB_USER || 'academic_user',
    password: process.env.DB_PASSWORD || 'academicpass',
    database: process.env.DB_NAME || 'academic_db',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5307,
    dialect: 'mysql',
    dialectOptions: { charset: 'utf8mb4' },
    define: { underscored: true, timestamps: true },
    migrationStorageTableName: 'SequelizeMeta',
};

module.exports = {
    development: base,
    test: { ...base, database: process.env.DB_NAME_TEST || `${base.database}_test` },
    production: base,
};
