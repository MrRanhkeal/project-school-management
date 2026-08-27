'use strict';

const { Op } = require('sequelize');
const { logger } = require('@school/shared');
const { Student, Teacher, Course, SchoolClass, Enrollment } = require('../models');

/**
 * Called by auth-service after /api/auth/register: creates the matching
 * domain profile (students/teachers row) bound to auth_db.users.id.
 *
 * Find-or-create semantics so the two directions never duplicate:
 *   1. a profile already linked to this userId  -> return it
 *   2. an unlinked profile with the same email  -> backfill its userId
 *   3. otherwise                                -> create a minimal profile
 */

function splitName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/);
    const firstName = parts.shift() || '-';
    const lastName = parts.join(' ') || firstName;
    return { firstName, lastName };
}

// e.g. S-0007 from userId 7; falls back to a suffixed code on collision
async function uniqueCode(model, field, prefix, userId) {
    const base = `${prefix}-${String(userId).padStart(4, '0')}`;
    const exists = await model.findOne({ where: { [field]: base } });
    return exists ? `${base}-${Math.floor(100 + Math.random() * 900)}` : base;
}

async function resolveStudentProfile({ userId, email, fullName }) {
    const linked = await Student.findOne({ where: { userId } });
    if (linked) return { ...linked.toJSON(), created: false };

    if (email) {
        const byEmail = await Student.findOne({ where: { email, userId: null } });
        if (byEmail) {
            await byEmail.update({ userId });
            return { ...byEmail.toJSON(), created: false };
        }
    }

    const studentCode = await uniqueCode(Student, 'studentCode', 'S', userId);
    const student = await Student.create({
        userId,
        email,
        studentCode,
        ...splitName(fullName),
        // Placeholders — staff completes these from the students screen.
        level: 'primary',
        enrollmentYear: new Date().getFullYear(),
    });
    logger.info('Student profile created from registration', {
        studentId: String(student.id),
        userId: String(userId),
    });
    return { ...student.toJSON(), created: true };
}

async function resolveTeacherProfile({ userId, email, fullName }) {
    const linked = await Teacher.findOne({ where: { userId } });
    if (linked) return { ...linked.toJSON(), created: false };

    if (email) {
        const byEmail = await Teacher.findOne({ where: { email, userId: null } });
        if (byEmail) {
            await byEmail.update({ userId });
            return { ...byEmail.toJSON(), created: false };
        }
    }

    const teacherCode = await uniqueCode(Teacher, 'teacherCode', 'T', userId);
    const teacher = await Teacher.create({
        userId,
        email,
        teacherCode,
        ...splitName(fullName),
    });
    logger.info('Teacher profile created from registration', {
        teacherId: String(teacher.id),
        userId: String(userId),
    });
    return { ...teacher.toJSON(), created: true };
}

async function resolveProfile({ userId, email, fullName, role }) {
    return role === 'teacher'
        ? resolveTeacherProfile({ userId, email, fullName })
        : resolveStudentProfile({ userId, email, fullName });
}

// ---------------------------------------------------------------------------
// Batch lookups + referential checks for record-service.
//
// record_db.grades / record_db.attendance store student_id / course_id /
// class_id referencing academic_db rows, but record_db lives on a DIFFERENT
// MySQL server, so a real FOREIGN KEY is impossible. These endpoints bind the
// relationship at the application level instead:
//   - verifyRefs()   : FK-style existence check before record-service writes
//   - get*ByIds()    : batch reads record-service uses to join names on reads
// ---------------------------------------------------------------------------

async function getStudentsByIds(ids) {
    const rows = await Student.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'studentCode', 'firstName', 'lastName', 'email', 'level', 'classId', 'status'],
        raw: true,
    });
    return rows.map((s) => ({ ...s, fullName: `${s.firstName} ${s.lastName}` }));
}

async function getCoursesByIds(ids) {
    return Course.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'code', 'title', 'level', 'teacherId', 'classId', 'status'],
        raw: true,
    });
}

async function getClassesByIds(ids) {
    return SchoolClass.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'name', 'level', 'gradeYear', 'academicYear', 'status'],
        raw: true,
    });
}

async function getEnrollmentsByIds(ids) {
    return Enrollment.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: [
            'id', 'studentId', 'courseId', 'classId',
            'academicYear', 'term', 'status', 'enrolledAt', 'finalGrade',
        ],
        raw: true,
    });
}

/**
 * Batch read for record-service: every enrollment of the given students,
 * so grades/attendance screens can show which courses a student is taking
 * without a second round-trip per student.
 */
async function getEnrollmentsByStudentIds(ids, { status } = {}) {
    const where = { studentId: { [Op.in]: ids } };
    if (status) where.status = status;
    return Enrollment.findAll({
        where,
        attributes: [
            'id', 'studentId', 'courseId', 'classId',
            'academicYear', 'term', 'status', 'enrolledAt', 'finalGrade',
        ],
        raw: true,
    });
}

/**
 * Business-rule check for record-service: a grade may only be recorded for a
 * student who is actually enrolled in that course. Returns the matching
 * enrollment (or null), so the caller can reject the write with a precise
 * error the same way a FOREIGN KEY would.
 */
async function verifyEnrollment({ studentId, courseId, academicYear, term, status = 'active' }) {
    const where = { studentId, courseId };
    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;
    if (status) where.status = status;
    const row = await Enrollment.findOne({
        where,
        attributes: ['id', 'studentId', 'courseId', 'classId', 'academicYear', 'term', 'status'],
        raw: true,
    });
    return { enrolled: Boolean(row), enrollment: row || null };
}

/**
 * Existence check for cross-service references. Returns the ids that do NOT
 * exist, grouped by kind, so the caller can reject the write with a precise
 * error — the closest equivalent of a FOREIGN KEY constraint across services.
 */
async function verifyRefs({ studentIds = [], courseIds = [], classIds = [], enrollmentIds = [] }) {
    const missing = {};
    const check = async (model, ids, key) => {
        const unique = [...new Set(ids.map(Number))];
        if (!unique.length) return;
        const rows = await model.findAll({
            where: { id: { [Op.in]: unique } },
            attributes: ['id'],
            raw: true,
        });
        const found = new Set(rows.map((r) => Number(r.id)));
        const absent = unique.filter((id) => !found.has(id));
        if (absent.length) missing[key] = absent;
    };

    await Promise.all([
        check(Student, studentIds, 'studentIds'),
        check(Course, courseIds, 'courseIds'),
        check(SchoolClass, classIds, 'classIds'),
        check(Enrollment, enrollmentIds, 'enrollmentIds'),
    ]);
    return { valid: Object.keys(missing).length === 0, missing };
}

module.exports = {
    resolveProfile,
    getStudentsByIds,
    getCoursesByIds,
    getClassesByIds,
    getEnrollmentsByIds,
    getEnrollmentsByStudentIds,
    verifyEnrollment,
    verifyRefs,
};
