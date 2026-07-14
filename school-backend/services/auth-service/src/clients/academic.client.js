'use strict';

/**
 * HTTP client for academic-service internal endpoints.
 * Used after /api/auth/register so a new student/teacher account immediately
 * gets its domain profile row (students/teachers) bound via userId.
 */

const { config, logger, ApiError } = require('@school/shared');

const BASE_URL = config.services.academicUrl;
const TIMEOUT_MS = 5000;

/**
 * Find-or-create the domain profile for a user.
 * Throws 502 if academic-service is down so register can roll back instead
 * of leaving an account without its profile row.
 */
async function resolveProfile({ userId, email, fullName, role }) {
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/academic/internal/profiles/resolve`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-internal-token': config.services.internalToken,
            },
            body: JSON.stringify({ userId, email, fullName, role }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });
    } catch (err) {
        logger.error('academic-service unreachable', { error: err.message });
        throw new ApiError(502, 'academic-service unavailable, cannot create profile');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new ApiError(res.status, json.message || `academic-service ${res.status}`);
    }
    return json.data;
}

module.exports = { resolveProfile };
