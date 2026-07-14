const { db } = require('@school/shared');

module.exports = db.createSequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5308,
    name: process.env.DB_NAME || 'record_db',
    user: process.env.DB_USER || 'record_user',
    password: process.env.DB_PASSWORD || 'recordpass',
})