'use strict';

const { config, ApiError, redis } = require('@school/shared');
const Grade = require('../models/grades.model');

const reportKey = (studentId, term) => `grade:report:${studentId}:${term || 'all'}`;

async function list(query) {
    const { page = 1, limit = 50, studentId, courseId, term } = query;
    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (term) where.term = term;

    const { rows, count } = await Grade.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['createdAt', 'DESC']],
    });
    return {
        items: rows.map((r) => r.toJSON()),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 1,
    };
}

async function create(data) {
    const grade = await Grade.create(data);
    await redis.invalidate(reportKey(data.studentId, '*'));
    return grade.toJSON();
}

async function update(id, data) {
    const grade = await Grade.findByPk(id);
    if (!grade) throw ApiError.notFound('Grade not found');
    await grade.update(data);
    await redis.invalidate(reportKey(grade.studentId, '*'));
    return grade.toJSON();
}

async function remove(id) {
    const grade = await Grade.findByPk(id);
    if (!grade) throw ApiError.notFound('Grade not found');
    const studentId = grade.studentId;
    await grade.destroy();
    await redis.invalidate(reportKey(studentId, '*'));
}

/**
 * Weighted student report card: per-course weighted percentage plus an overall
 * GPA on a 4.0 scale. Cached because report cards are viewed far more often
 * than grades change.
 */
async function studentReport(studentId, term) {
    return redis.cacheWrap(reportKey(studentId, term), config.redis.cacheTtl, async () => {
        const where = { studentId };
        if (term) where.term = term;
        const grades = await Grade.findAll({ where, raw: true });

        const byCourse = new Map();
        for (const g of grades) {
            const pct = (Number(g.score) / Number(g.maxScore)) * 100;
            const weight = Number(g.weight) || 1;
            const entry = byCourse.get(g.courseId) || { weightedSum: 0, weightTotal: 0, items: 0 };
            entry.weightedSum += pct * weight;
            entry.weightTotal += weight;
            entry.items += 1;
            byCourse.set(g.courseId, entry);
        }

        const courses = [...byCourse.entries()].map(([courseId, e]) => {
            const percentage = e.weightTotal ? e.weightedSum / e.weightTotal : 0;
            return {
                courseId,
                percentage: Math.round(percentage * 10) / 10,
                gpaPoints: percentageToGpa(percentage),
                assessments: e.items,
            };
        });

        const gpa =
            courses.length
                ? Math.round((courses.reduce((s, c) => s + c.gpaPoints, 0) / courses.length) * 100) / 100
                : null;

        return { studentId: Number(studentId), term: term || 'all', courses, gpa };
    });
}

/** Standard 4.0-scale conversion. */
function percentageToGpa(p) {
    if (p >= 93) return 4.0;
    if (p >= 90) return 3.7;
    if (p >= 87) return 3.3;
    if (p >= 83) return 3.0;
    if (p >= 80) return 2.7;
    if (p >= 77) return 2.3;
    if (p >= 73) return 2.0;
    if (p >= 70) return 1.7;
    if (p >= 67) return 1.3;
    if (p >= 60) return 1.0;
    return 0.0;
}

module.exports = { list, create, update, remove, studentReport };
