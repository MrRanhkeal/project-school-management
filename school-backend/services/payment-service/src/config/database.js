'use payment-service';

const { db } = require('@school/shared');

module.exports = {
    sequelize: db.createSequelize({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5309,
        name: process.env.DB_NAME || 'payment_db',
        user: process.env.DB_USER || 'payment_user',
        password: process.env.DB_PASSWORD || 'paymentpass',
    }),

    BAKONG: {
        BASE_URL: process.env.BAKONG_BASE_URL || 'https://api-bakong.nbc.gov.kh/v1',
        ACCESS_TOKEN: process.env.BAKONG_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiZmNiNDBmMWZiZTJlNGM5OSJ9LCJpYXQiOjE3NTczNTYyNzgsImV4cCI6MTc2NTEzMjI3OH0.KqqN9MOdlnkQEcMPOasmvxgMHyNpmVyS3y-u4w9ufr4',
        ACCOUNT_ID: process.env.BAKONG_ACCOUNT_ID || "ranh_keal@aclb",
        ACCOUNT_NAME: process.env.BAKONG_ACCOUNT_NAME || "Keal Ranh",
        CITY: process.env.BAKONG_CITY || "PHNOM PENH",
        // Set BOTH to generate merchant KHQR instead of individual KHQR
        MERCHANT_ID: process.env.BAKONG_KHQR_MERCHANT_ID || null,
        ACQUIRING_BANK: process.env.BAKONG_ACQUIRING_BANK || null,
    }
};
