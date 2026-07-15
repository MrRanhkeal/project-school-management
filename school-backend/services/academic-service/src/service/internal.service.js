'use strict';

const { Op } = require('sequelize');
const { logger, redis } = require('@school/shared');
const { Student, Teacher, Course, SchoolClass } = require('../models');

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
            await Promise.all([
                redis.invalidate(`student:${byEmail.id}`),
                redis.invalidate('student:list:*'),
            ]);
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
    await redis.invalidate('student:list:*');
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
            await Promise.all([
                redis.invalidate(`teacher:${byEmail.id}`),
                redis.invalidate('teacher:list:*'),
            ]);
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
    await redis.invalidate('teacher:list:*');
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

/**
 * Existence check for cross-service references. Returns the ids that do NOT
 * exist, grouped by kind, so the caller can reject the write with a precise
 * error — the closest equivalent of a FOREIGN KEY constraint across services.
 */
async function verifyRefs({ studentIds = [], courseIds = [], classIds = [] }) {
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
    ]);
    return { valid: Object.keys(missing).length === 0, missing };
}

module.exports = {
    resolveProfile,
    getStudentsByIds,
    getCoursesByIds,
    getClassesByIds,
    verifyRefs,
};
