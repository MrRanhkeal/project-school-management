'use strict';

const { Op } = require('sequelize');
const { ApiError, redis, logger } = require('@school/shared');
const { sequelize, Enrollment, Student, Course, SchoolClass } = require('../models');
const notificationClient = require('../clients/notification.client');

const DEFAULT_TERM = 'full_year';
// Status a student's own join lands on. Switch to 'pending' if joins
// should wait for staff approval before they count.
const SELF_JOIN_STATUS = 'active';

const enrollmentIncludes = [
    {
        model: Student,
        as: 'student',
        attributes: ['id', 'studentCode', 'firstName', 'lastName', 'level', 'email', 'status'],
    },
    {
        model: Course,
        as: 'course',
        attributes: ['id', 'code', 'title', 'level', 'credits', 'teacherId', 'status'],
    },
    {
        model: SchoolClass,
        as: 'class',
        attributes: ['id', 'name', 'level', 'academicYear'],
    },
];

// ---------------------------------------------------------------------------
// Referential checks — the in-database FKs only fire on write, so we surface
// a clean 404/409 before Sequelize raises a constraint error.
// ---------------------------------------------------------------------------

/** studentId / courseId / classId must point to real rows before we bind them. */
async function assertRelationsExist({ studentId, courseId, classId }) {
    if (studentId != null) {
        const found = await Student.count({ where: { id: studentId } });
        if (!found) throw ApiError.notFound(`Student ${studentId} not found`);
    }
    if (courseId != null) {
        const found = await Course.count({ where: { id: courseId } });
        if (!found) throw ApiError.notFound(`Course ${courseId} not found`);
    }
    if (classId != null) {
        const found = await SchoolClass.count({ where: { id: classId } });
        if (!found) throw ApiError.notFound(`Class ${classId} not found`);
    }
}

/** A closed/archived course cannot take new enrollments. */
async function assertCourseOpen(courseId) {
    const course = await Course.findByPk(courseId);
    if (!course) throw ApiError.notFound(`Course ${courseId} not found`);
    if (course.status !== 'open') {
        throw ApiError.conflict(`Course ${course.code} is ${course.status} and not open for enrollment`);
    }
    return course;
}

/** Mirrors the uq_enrollment_student_course_year_term unique index. */
async function assertNotAlreadyEnrolled({ studentId, courseId, academicYear, term }) {
    const existing = await Enrollment.findOne({
        where: { studentId, courseId, academicYear, term },
    });
    if (existing) {
        throw ApiError.conflict(
            `Student ${studentId} is already enrolled in course ${courseId} for ${academicYear} (${term})`,
        );
    }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** Single enrollment read goes through Redis (cache-aside). */
async function getById(id) {
    const row = await redis.byId(Enrollment, id, async () => {
        const r = await Enrollment.findByPk(id, { include: enrollmentIncludes });
        return r ? r.toJSON() : null;
    });
    if (!row) throw ApiError.notFound('Enrollment not found');
    return row;
}

/**
 * Paginated, filterable listing. Cached per filter-combination so identical
 * dashboard queries don't re-hit MySQL within the TTL window.
 */
async function list(query) {
    const {
        page = 1,
        limit = 20,
        studentId,
        courseId,
        classId,
        academicYear,
        term,
        status,
        search,
    } = query;
    const offset = (page - 1) * limit;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (courseId) where.courseId = courseId;
    if (classId) where.classId = classId;
    if (academicYear) where.academicYear = academicYear;
    if (term) where.term = term;
    if (status) where.status = status;
    if (search) {
        // Matches on the joined student / course columns. The $alias.column$
        // form is emitted verbatim, so these are the real (underscored)
        // column names, not the model attribute names.
        where[Op.or] = [
            { '$student.student_code$': { [Op.like]: `%${search}%` } },
            { '$student.first_name$': { [Op.like]: `%${search}%` } },
            { '$student.last_name$': { [Op.like]: `%${search}%` } },
            { '$course.code$': { [Op.like]: `%${search}%` } },
            { '$course.title$': { [Op.like]: `%${search}%` } },
        ];
    }

    return redis.list(Enrollment, { studentId, courseId, classId, academicYear, term, status, search, page, limit }, async () => {
        const { rows, count } = await Enrollment.findAndCountAll({
            where,
            limit,
            offset,
            include: enrollmentIncludes,
            order: [['id', 'DESC']],
            // all includes are belongsTo (one row each), so a flat join keeps
            // the LIMIT correct while still allowing the $nested$ search above.
            subQuery: false,
            distinct: true,
        });
        return {
            items: rows.map((r) => r.toJSON()),
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1,
        };
    });
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

function enrollmentNotification(enrollment, course, student, type) {
    return {
        type,
        studentId: Number(enrollment.studentId),
        to: student && student.email ? student.email : undefined,
        data: {
            enrollmentId: Number(enrollment.id),
            fullName: student ? `${student.firstName} ${student.lastName}`.trim() : undefined,
            studentCode: student ? student.studentCode : undefined,
            courseCode: course ? course.code : undefined,
            courseTitle: course ? course.title : undefined,
            academicYear: enrollment.academicYear,
            term: enrollment.term,
        },
    };
}

async function create(data) {
    const term = data.term || DEFAULT_TERM;
    const payload = { ...data, term };

    await assertRelationsExist(payload);
    const course = await assertCourseOpen(payload.courseId);
    await assertNotAlreadyEnrolled(payload);

    // Fall back to the class the course is scheduled in.
    if (payload.classId == null && course.classId != null) payload.classId = course.classId;
    if (!payload.enrolledAt) payload.enrolledAt = new Date().toISOString().slice(0, 10);

    const enrollment = await Enrollment.create(payload);

    const student = await Student.findByPk(payload.studentId);
    // Fire-and-forget enrollment notification (never blocks the response).
    notificationClient.notify(
        enrollmentNotification(enrollment, course, student, 'course-enrolled'),
    );

    return enrollment.toJSON();
}

/**
 * Enroll a batch of students into one course. Students already enrolled for
 * the same year/term are skipped rather than failing the whole batch, so a
 * staff member can safely re-run the same roster.
 */
async function bulkCreate(data) {
    const { courseId, studentIds, academicYear } = data;
    const term = data.term || DEFAULT_TERM;

    const course = await assertCourseOpen(courseId);
    if (data.classId != null) await assertRelationsExist({ classId: data.classId });

    const uniqueIds = [...new Set(studentIds.map(Number))];

    const students = await Student.findAll({ where: { id: { [Op.in]: uniqueIds } } });
    const byId = new Map(students.map((s) => [Number(s.id), s]));
    const missing = uniqueIds.filter((id) => !byId.has(id));
    if (missing.length) throw ApiError.notFound(`Student(s) not found: ${missing.join(', ')}`);

    const already = await Enrollment.findAll({
        where: { courseId, academicYear, term, studentId: { [Op.in]: uniqueIds } },
        attributes: ['studentId'],
        raw: true,
    });
    const skipped = already.map((e) => Number(e.studentId));
    const skippedSet = new Set(skipped);
    const toCreate = uniqueIds.filter((id) => !skippedSet.has(id));

    if (!toCreate.length) {
        return { created: [], createdCount: 0, skipped, skippedCount: skipped.length };
    }

    const classId = data.classId != null ? data.classId : course.classId;
    const enrolledAt = data.enrolledAt || new Date().toISOString().slice(0, 10);
    const rows = toCreate.map((studentId) => ({
        studentId,
        courseId,
        classId,
        academicYear,
        term,
        status: data.status || 'active',
        enrolledAt,
    }));

    const created = await sequelize.transaction((tx) =>
        Enrollment.bulkCreate(rows, { transaction: tx, validate: true }),
    );

    logger.info('Bulk enrollment created', {
        courseId: String(courseId),
        created: created.length,
        skipped: skipped.length,
    });

    notificationClient.notify(
        created.map((e) =>
            enrollmentNotification(e, course, byId.get(Number(e.studentId)), 'course-enrolled'),
        ),
    );

    return {
        created: created.map((e) => e.toJSON()),
        createdCount: created.length,
        skipped,
        skippedCount: skipped.length,
    };
}

async function update(id, data) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw ApiError.notFound('Enrollment not found');

    const payload = { ...data };
    await assertRelationsExist({ classId: payload.classId });

    // Moving to another year/term must not collide with an existing row.
    const nextYear = payload.academicYear || enrollment.academicYear;
    const nextTerm = payload.term || enrollment.term;
    if (nextYear !== enrollment.academicYear || nextTerm !== enrollment.term) {
        const clash = await Enrollment.findOne({
            where: {
                id: { [Op.ne]: enrollment.id },
                studentId: enrollment.studentId,
                courseId: enrollment.courseId,
                academicYear: nextYear,
                term: nextTerm,
            },
        });
        if (clash) {
            throw ApiError.conflict(
                `Another enrollment already exists for this student/course in ${nextYear} (${nextTerm})`,
            );
        }
    }

    // Stamp the lifecycle dates when the status moves, unless given explicitly.
    const today = new Date().toISOString().slice(0, 10);
    const statusChanged = payload.status && payload.status !== enrollment.status;
    if (statusChanged && payload.status === 'completed' && !payload.completedAt) {
        payload.completedAt = today;
    }
    if (statusChanged && payload.status === 'dropped' && !payload.droppedAt) {
        payload.droppedAt = today;
    }

    await enrollment.update(payload);

    if (statusChanged && payload.status === 'dropped') {
        const [course, student] = await Promise.all([
            Course.findByPk(enrollment.courseId),
            Student.findByPk(enrollment.studentId),
        ]);
        notificationClient.notify(
            enrollmentNotification(enrollment, course, student, 'course-dropped'),
        );
    }

    return enrollment.toJSON();
}

// ---------------------------------------------------------------------------
// Self-service (role: student)
// ---------------------------------------------------------------------------

/**
 * Map the JWT identity onto the student row it owns. Student profiles carry
 * userId (auth_db.users.id) with no FK across the service boundary, so an
 * account with no linked profile is a 403 rather than a 404 on the course.
 */
async function resolveSelfStudent(user, { requireEnrolled = true } = {}) {
    const userId = Number((user && (user.sub || user.userId || user.id)) || 0);
    if (!userId) throw ApiError.forbidden('No student profile is linked to this account');

    const student = await Student.findOne({ where: { userId } });
    if (!student) throw ApiError.forbidden('No student profile is linked to this account');
    if (requireEnrolled && student.status !== 'enrolled') {
        throw ApiError.forbidden(
            `Your student record is ${student.status} and cannot join courses`,
        );
    }
    return student;
}

/** The caller's own enrollments — used by the student view of the roster. */
async function listMine(user, query = {}) {
    const student = await resolveSelfStudent(user, { requireEnrolled: false });
    return list({ ...query, studentId: Number(student.id) });
}

/**
 * A student joins an open course themselves. studentId is always taken from
 * the token, never from the body, so this route cannot enroll anyone else.
 * Everything else (course-open, duplicate, class fallback, notification)
 * reuses create().
 */
async function joinSelf(user, data) {
    const student = await resolveSelfStudent(user);

    const enrollment = await create({
        studentId: Number(student.id),
        courseId: data.courseId,
        academicYear: data.academicYear,
        term: data.term,
        // A self-join never picks its own status, grade or back-dated day.
        status: SELF_JOIN_STATUS,
    });

    logger.info('Self enrollment created', {
        studentId: String(student.id),
        courseId: String(data.courseId),
    });

    return enrollment;
}

/**
 * A student drops one of their own enrollments. The row is kept and marked
 * 'dropped' (same lifecycle as the staff-side update) rather than deleted —
 * DELETE /enrollments/:id stays admin-only.
 */
async function dropSelf(user, id) {
    const student = await resolveSelfStudent(user, { requireEnrolled: false });

    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw ApiError.notFound('Enrollment not found');
    if (Number(enrollment.studentId) !== Number(student.id)) {
        // Same shape as a missing row, so the endpoint can't be used to probe
        // which enrollment ids exist.
        throw ApiError.notFound('Enrollment not found');
    }
    if (enrollment.status === 'dropped') return enrollment.toJSON();
    if (enrollment.status === 'completed') {
        throw ApiError.conflict('A completed course cannot be dropped');
    }

    return update(enrollment.id, { status: 'dropped' });
}

async function remove(id) {
    const enrollment = await Enrollment.findByPk(id);
    if (!enrollment) throw ApiError.notFound('Enrollment not found');
    await enrollment.destroy();
}

module.exports = {
    getById,
    list,
    create,
    bulkCreate,
    update,
    remove,
    listMine,
    joinSelf,
    dropSelf,
    resolveSelfStudent,
};
