'use strict';

const nodemailer = require('nodemailer');
const { logger, redis } = require('@school/shared');
const directory = require('./clients/directory.client');

const RECENT_KEY = 'notifications:recent';
const RECENT_MAX = 500;

// Build an SMTP transport only if configured; otherwise we log-dispatch so the
// system runs end-to-end in dev/CI without a mail server.
let transport = null;
if (process.env.SMTP_HOST) {
    transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10) || 587,
        secure: false,
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
    });
}

/**
 * Message templates keyed by event type. One template per producing service:
 *   auth-service     -> user-registered
 *   academic-service -> student-enrolled
 *   record-service   -> attendance-absence
 *   payment-service  -> payment-completed
 * Unknown types fall through to the generic subject/text payload.
 */
function renderMessage(payload) {
    const d = payload.data || {};
    switch (payload.type) {
        case 'user-registered':
            return {
                subject: 'Welcome to the school system',
                text: `Hello ${d.fullName || 'there'}, your ${d.role || 'user'} account (${d.email || ''}) has been created.`,
            };
        case 'student-enrolled':
            return {
                subject: 'Student enrollment confirmed',
                text: `Student ${d.fullName || payload.studentId} (${d.studentCode || 'no code'}) has been enrolled.`,
            };
        case 'attendance-absence':
            return {
                subject: 'Absence notification',
                text: `Student ${d.fullName || payload.studentId} was marked absent on ${d.date || payload.date}.`,
            };
        case 'payment-completed':
            return {
                subject: 'Payment received',
                text: `Payment #${d.paymentId || ''} of ${d.amount} ${d.currency || ''} for student ${d.fullName || payload.studentId} was completed.`,
            };
        default:
            return {
                subject: payload.subject || 'School notification',
                text: payload.text || JSON.stringify(payload),
            };
    }
}

/**
 * Resolve the recipient. Explicit `to` wins; otherwise bind the event's
 * userId (auth_db) or studentId (academic_db) back to an email through the
 * directory client. Also returns the resolved fullName so templates can
 * address the person even when the producer only sent an id.
 */
async function resolveRecipient(payload) {
    if (payload.to) return { to: payload.to, fullName: payload.data?.fullName };
    if (payload.userId) {
        const user = await directory.userForId(payload.userId);
        if (user) return { to: user.email || null, fullName: user.fullName };
    }
    if (payload.studentId) {
        const student = await directory.studentForId(payload.studentId);
        if (student) return { to: student.email || null, fullName: student.fullName };
    }
    return { to: null, fullName: undefined };
}

/**
 * Deliver a notification and append it to a capped Redis "recent" list so the
 * API can surface history without a dedicated database.
 */
async function dispatch(payload) {
    const { to, fullName } = await resolveRecipient(payload);
    if (fullName && !payload.data?.fullName) {
        payload = { ...payload, data: { ...payload.data, fullName } };
    }
    const msg = renderMessage(payload);
    const record = {
        ...payload,
        to: to || payload.to,
        subject: msg.subject,
        deliveredAt: new Date().toISOString(),
        channel: transport && to ? 'email' : 'log',
    };

    if (transport && to) {
        await transport.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@mail.com',
            to,
            subject: msg.subject,
            text: msg.text,
        });
    } else {
        logger.info('Notification dispatched (log channel)', {
            type: payload.type,
            source: payload.source,
            subject: msg.subject,
            text: msg.text,
        });
    }

    const client = redis.getRedis();
    await client
        .multi()
        .lpush(RECENT_KEY, JSON.stringify(record))
        .ltrim(RECENT_KEY, 0, RECENT_MAX - 1)
        .exec();

    return record;
}

async function recent(limit = 50) {
    const items = await redis.getRedis().lrange(RECENT_KEY, 0, limit - 1);
    return items.map((i) => JSON.parse(i));
}

module.exports = { dispatch, recent };
