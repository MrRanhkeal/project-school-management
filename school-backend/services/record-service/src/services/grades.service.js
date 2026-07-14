'use strict';

const { config, ApiError, redis } = require('@school/shared');
const Grade = require('../models/grades.model');
const academic = require('../clients/academic.client');

const reportKey = (studentId, term) => `grade:report:${studentId}:${term || 'all'}`;

/** FK-style check against academic_db for whichever refs the payload carries. */
async function verifyGradeRefs(data) {
    await academic.verifyRefs({
        studentIds: data.studentId ? [data.studentId] : [],
        courseIds: data.courseId ? [data.courseId] : [],
        classIds: data.classId ? [data.classId] : [],
    });
}

/** Application-level join: attach student + course info from academic-service. */
async function joinAcademic(items) {
    const [students, courses] = await Promise.all([
        academic.getStudentsByIds(items.map((g) => g.studentId)),
        academic.getCoursesByIds(items.map((g) => g.courseId)),
    ]);
    return items.map((g) => ({
        ...g,
        student: students[g.studentId] || null,
        course: courses[g.courseId] || null,
    }));
}

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
        items: await joinAcademic(rows.map((r) => r.toJSON())),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 1,
    };
}

async function create(data) {
    await verifyGradeRefs(data);
    const grade = await Grade.create(data);
    await redis.invalidate(reportKey(data.studentId, '*'));
    return grade.toJSON();
}

async function update(id, data) {
    const grade = await Grade.findByPk(id);
    if (!grade) throw ApiError.notFound('Grade not found');
    await verifyGradeRefs(data);
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

        // Join course/student names from academic-service so the report card
        // is readable without a second round trip from the frontend.
        const [courseInfo, studentInfo] = await Promise.all([
            academic.getCoursesByIds([...byCourse.keys()]),
            academic.getStudentsByIds([studentId]),
        ]);

        const courses = [...byCourse.entries()].map(([courseId, e]) => {
            const percentage = e.weightTotal ? e.weightedSum / e.weightTotal : 0;
            return {
                courseId,
                courseCode: courseInfo[courseId]?.code || null,
                courseTitle: courseInfo[courseId]?.title || null,
                percentage: Math.round(percentage * 10) / 10,
                gpaPoints: percentageToGpa(percentage),
                assessments: e.items,
            };
        });

        const gpa =
            courses.length
                ? Math.round((courses.reduce((s, c) => s + c.gpaPoints, 0) / courses.length) * 100) / 100
                : null;

        return {
            studentId: Number(studentId),
            student: studentInfo[studentId] || null,
            term: term || 'all',
            courses,
            gpa,
        };
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
