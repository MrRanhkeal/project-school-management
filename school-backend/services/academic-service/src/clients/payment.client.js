'use strict';

/**
 * HTTP client for payment-service internal endpoints.
 *
 * payment_db lives on a separate MySQL server, so the Sequelize association
 *   Student.hasMany(Payment, { foreignKey: 'studentId', as: 'payments' })
 * cannot be declared here. The relationship is bound at the application
 * level instead:
 *   - getPaymentsByStudentIds() : batch lookup used to attach the `payments`
 *                                 array on student reads (hasMany join).
 *   - assertNoPayments()        : onDelete 'RESTRICT' equivalent — blocks
 *                                 deleting a student with payment history.
 */

const { config, logger, ApiError } = require('@school/shared');

const BASE_URL = config.services.paymentUrl;
const HEADERS = {
    'content-type': 'application/json',
    'x-internal-token': config.services.internalToken,
};
const TIMEOUT_MS = 5000;

async function request(method, path) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, json.message || `payment-service ${res.status}`);
    }
    return json.data;
}

/**
 * Batch lookup for read-side joins; returns a map { [studentId]: [payments] }.
 * Soft-fail to an empty map so student reads still work if payment-service
 * is down (students simply come back without the joined payments).
 */
async function getPaymentsByStudentIds(ids) {
    const unique = [...new Set(ids.filter(Boolean).map(Number))];
    if (!unique.length) return {};
    try {
        const rows = await request('GET', `/api/payments/internal/by-student?ids=${unique.join(',')}`);
        const byStudent = {};
        for (const p of rows) {
            (byStudent[p.studentId] ??= []).push(p);
        }
        return byStudent;
    } catch (err) {
        logger.warn('Could not join payments from payment-service', { error: err.message });
        return {};
    }
}

/**
 * onDelete: 'RESTRICT' across services. Throws:
 *   - 409 when the student still has payments in payment_db
 *   - 502 when payment-service is unreachable, so a student is never deleted
 *     while their payment history cannot be checked.
 */
async function assertNoPayments(studentId) {
    let rows;
    try {
        rows = await request('GET', `/api/payments/internal/by-student?ids=${Number(studentId)}`);
    } catch (err) {
        if (err instanceof ApiError) throw err;
        logger.error('payment-service unreachable', { error: err.message });
        throw new ApiError(502, 'payment-service unavailable, cannot verify the student has no payments');
    }
    if (rows.length) {
        throw new ApiError(409, `Cannot delete student ${studentId}: ${rows.length} payment(s) exist`);
    }
}

module.exports = { getPaymentsByStudentIds, assertNoPayments };
