`use strict`
const { db } = require('@school/shared')


const sequilize =db.createSequelize({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5307,
    name: process.env.DB_NAME || 'academic_db',
    user: process.env.DB_USER || 'academic_user',
    password: process.env.DB_PASSWORD || 'academicpass'
})

module.exports = sequilize;