'use strict';

/**
 * HTTP client for academic-service internal endpoints.
 *
 * payment_db and academic_db live on separate MySQL servers, so
 * payments.studentId cannot be a real FOREIGN KEY into academic_db.students,
 * and Sequelize's Student.hasMany(Payment) / Payment.belongsTo(Student)
 * cannot be declared across services. The relationship is bound here instead:
 *   - verifyStudent()    : FK-style existence check before every payment
 *                          write; throws 422 for an unknown studentId so bad
 *                          references are rejected exactly like a FK
 *                          violation would be.
 *   - getStudentsByIds() : batch lookup used to attach the `student` object
 *                          on payment reads (Payment.belongsTo equivalent).
 */

const { config, logger, ApiError } = require('@school/shared');

const BASE_URL = config.services.academicUrl;
const HEADERS = {
    'content-type': 'application/json',
    'x-internal-token': config.services.internalToken,
};
const TIMEOUT_MS = 5000;

async function request(method, path, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: HEADERS,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, json.message || `academic-service ${res.status}`);
    }
    return json.data;
}

/**
 * FK-style referential check on payments.studentId. Throws:
 *   - 422 when the student does not exist in academic_db
 *   - 502 when academic-service is unreachable, so a payment is never
 *     accepted with a studentId nobody could verify.
 */
async function verifyStudent(studentId) {
    if (!studentId) return;
    let result;
    try {
        result = await request('POST', '/api/academic/internal/refs/verify', {
            studentIds: [studentId],
        });
    } catch (err) {
        if (err instanceof ApiError) throw err;
        logger.error('academic-service unreachable', { error: err.message });
        throw new ApiError(502, 'academic-service unavailable, cannot verify student reference');
    }
    if (!result.valid) {
        throw new ApiError(422, `Reference check failed — unknown student id: ${studentId}`, result.missing);
    }
}

/**
 * Batch lookup for read-side joins; returns a map { [id]: student }.
 * Soft-fail to an empty map so payment reads still work if academic-service
 * is down (payments simply come back without the joined student).
 */
async function getStudentsByIds(ids) {
    const unique = [...new Set(ids.filter(Boolean).map(Number))];
    if (!unique.length) return {};
    try {
        const rows = await request('GET', `/api/academic/internal/students?ids=${unique.join(',')}`);
        return Object.fromEntries(rows.map((r) => [r.id, r]));
    } catch (err) {
        logger.warn('Could not join student from academic-service', { error: err.message });
        return {};
    }
}

module.exports = { verifyStudent, getStudentsByIds };
