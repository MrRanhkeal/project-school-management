'use strict';

/**
 * HTTP client for academic-service internal endpoints.
 *
 * record_db and academic_db live on separate MySQL servers, so
 * grades.student_id / grades.course_id / attendance.class_id cannot be real
 * FOREIGN KEYs into academic_db.students / courses / classes. The
 * "relationship" is bound here instead:
 *   - verifyRefs()      : FK-style existence check before every write; throws
 *                         422 listing the unknown ids so bad references are
 *                         rejected exactly like a FK violation would be.
 *   - getStudentsByIds(): batch lookup used to attach student info on reads
 *   - getCoursesByIds() : batch lookup used to attach course info on reads
 *   - getClassesByIds() : batch lookup used to attach class info on reads
 *                         (application-level joins).
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
 * FK-style referential check. Pass only the id kinds the write touches;
 * resolves quietly when every id exists. Throws:
 *   - 422 when one or more ids don't exist in academic_db (with details)
 *   - 502 when academic-service is unreachable, so a write is never accepted
 *     with references nobody could verify.
 */
async function verifyRefs({ studentIds = [], courseIds = [], classIds = [] }) {
    if (!studentIds.length && !courseIds.length && !classIds.length) return;
    let result;
    try {
        result = await request('POST', '/api/academic/internal/refs/verify', {
            studentIds,
            courseIds,
            classIds,
        });
    } catch (err) {
        if (err instanceof ApiError) throw err;
        logger.error('academic-service unreachable', { error: err.message });
        throw new ApiError(502, 'academic-service unavailable, cannot verify student/course/class references');
    }
    if (!result.valid) {
        const parts = Object.entries(result.missing).map(
            ([kind, ids]) => `unknown ${kind.replace('Ids', '')} id(s): ${ids.join(', ')}`
        );
        throw new ApiError(422, `Reference check failed — ${parts.join('; ')}`, result.missing);
    }
}

/**
 * Batch lookups for read-side joins; each returns a map { [id]: row }.
 * Soft-fail to an empty map so reads still work if academic-service is down
 * (records simply come back without the joined names).
 */
async function lookup(path, ids) {
    const unique = [...new Set(ids.filter(Boolean).map(Number))];
    if (!unique.length) return {};
    try {
        const rows = await request('GET', `${path}?ids=${unique.join(',')}`);
        return Object.fromEntries(rows.map((r) => [r.id, r]));
    } catch (err) {
        logger.warn('Could not join from academic-service', { path, error: err.message });
        return {};
    }
}

const getStudentsByIds = (ids) => lookup('/api/academic/internal/students', ids);
const getCoursesByIds = (ids) => lookup('/api/academic/internal/courses', ids);
const getClassesByIds = (ids) => lookup('/api/academic/internal/classes', ids);

module.exports = { verifyRefs, getStudentsByIds, getCoursesByIds, getClassesByIds };
