'use strict';

/**
 * HTTP client for auth-service and academic-service internal endpoints.
 *
 * Events sent by the other services usually carry a userId (auth_db) or a
 * studentId (academic_db) instead of an email address. This client binds
 * those references back to a deliverable recipient:
 *   - userForId()    : auth_db user (email, fullName) for a userId
 *   - studentForId() : academic_db student (email, fullName) for a studentId
 *
 * Everything soft-fails to null: when a directory service is down the
 * notification simply falls back to the log channel instead of failing.
 */

const { config, logger } = require('@school/shared');

const HEADERS = { 'x-internal-token': config.services.internalToken };
const TIMEOUT_MS = 5000;

async function get(baseUrl, path) {
    const res = await fetch(`${baseUrl}${path}`, {
        headers: HEADERS,
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
    return json.data;
}

async function userForId(userId) {
    if (!userId) return null;
    try {
        const users = await get(config.services.authUrl, `/api/auth/internal/users?ids=${userId}`);
        return users?.[0] || null;
    } catch (err) {
        logger.warn('Could not resolve user from auth-service', { userId, error: err.message });
        return null;
    }
}

async function studentForId(studentId) {
    if (!studentId) return null;
    try {
        const students = await get(
            config.services.academicUrl,
            `/api/academic/internal/students?ids=${studentId}`
        );
        return students?.[0] || null;
    } catch (err) {
        logger.warn('Could not resolve student from academic-service', {
            studentId,
            error: err.message,
        });
        return null;
    }
}

module.exports = { userForId, studentForId };
