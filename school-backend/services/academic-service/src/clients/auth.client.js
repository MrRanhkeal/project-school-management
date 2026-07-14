'use strict';

/**
 * HTTP client for auth-service internal endpoints.
 *
 * auth_db and academic_db live on separate MySQL servers, so there is no SQL
 * foreign key or JOIN across them. The "relationship" is bound here instead:
 *   - resolveUser()  : find-or-create the auth user, returns its id to store
 *                      in teachers.user_id / students.user_id.
 *   - getUsersByIds(): batch lookup used to attach user info on reads
 *                      (application-level join).
 */

const { config, logger, ApiError } = require('@school/shared');

const BASE_URL = config.services.authUrl;
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
        throw new ApiError(res.status, json.message || `auth-service ${res.status}`);
    }
    return json.data;
}

/**
 * Find-or-create an auth user for a profile; returns { id, email, fullName,
 * role, status, created, tempPassword? }. `password` (optional) becomes the
 * account password when a new user is created; otherwise a random temp
 * password is generated and returned. Throws 502 if auth-service is down
 * so the caller never silently writes a NULL userId.
 */
async function resolveUser({ email, fullName, role, password }) {
    try {
        return await request('POST', '/api/auth/internal/users/resolve', { email, fullName, role, password });
    } catch (err) {
        if (err instanceof ApiError) throw err;
        logger.error('auth-service unreachable', { error: err.message });
        throw new ApiError(502, 'auth-service unavailable, cannot link user account');
    }
}

/**
 * Fetch users for the given ids; returns a map { [id]: user }.
 * Soft-fails to an empty map so reads still work if auth-service is down.
 */
async function getUsersByIds(ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return {};
    try {
        const users = await request('GET', `/api/auth/internal/users?ids=${unique.join(',')}`);
        return Object.fromEntries(users.map((u) => [u.id, u]));
    } catch (err) {
        logger.warn('Could not join users from auth-service', { error: err.message });
        return {};
    }
}

module.exports = { resolveUser, getUsersByIds };
