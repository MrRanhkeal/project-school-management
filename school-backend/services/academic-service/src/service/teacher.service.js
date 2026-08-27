'use strict';

const { Op } = require('sequelize');
const { ApiError, redis } = require('@school/shared');
const { Teacher, SchoolClass, Course } = require('../models');
const authClient = require('../clients/auth.client');

/**
 * Ensure the teacher has an auth_db user and return its id.
 * Find-or-create by email in auth-service (application-level FK binding).
 */
async function resolveAuthUser({ email, firstName, lastName, password }) {
    if (!email) return null;
    return authClient.resolveUser({
        email,
        fullName: `${firstName} ${lastName}`.trim(),
        role: 'teacher',
        password,
    });
}

/** Application-level join: attach auth_db user info to teacher rows. */
async function withUsers(teachers) {
    const users = await authClient.getUsersByIds(teachers.map((t) => t.userId));
    for (const t of teachers) t.user = t.userId ? users[t.userId] || null : null;
    return teachers;
}

async function getById(id) {
    const teacher = await redis.byId(Teacher, id, async () => {
        const row = await Teacher.findByPk(id, {
            include: [
                {
                    model: SchoolClass,
                    as: 'homeroomClasses',
                    attributes: ['id', 'name', 'level', 'academicYear', 'status'],
                },
                {
                    model: Course,
                    as: 'courses',
                    attributes: ['id', 'code', 'title', 'classId', 'academicYear', 'status'],
                },
            ],
        });
        return row ? row.toJSON() : null;
    });
    if (!teacher) throw ApiError.notFound('Teacher not found');
    await withUsers([teacher]);
    return teacher;
}

async function list(query) {
    const { page = 1, limit = 20, department, status, search } = query;
    const where = {};
    if (department) where.department = department;
    if (status) where.status = status;
    if (search) {
        where[Op.or] = [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { teacherCode: { [Op.like]: `%${search}%` } },
        ];
    }
    const result = await redis.list(Teacher, { page, limit, department, status, search }, async () => {
        const { rows, count } = await Teacher.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            order: [['lastName', 'ASC']],
        });
        return {
            items: rows.map((r) => r.toJSON()),
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit) || 1,
        };
    });
    await withUsers(result.items);
    return result;
}

async function create(data) {
    const exists = await Teacher.findOne({ where: { teacherCode: data.teacherCode } });
    if (exists) throw ApiError.conflict('teacherCode already exists');

    // Bind to auth_db: find-or-create the user account and store its id.
    // The password (if given) only sets the auth account's password — it is
    // never stored in academic_db.
    let authUser = null;
    if (!data.userId) {
        authUser = await resolveAuthUser(data);
        if (authUser) data.userId = authUser.id;
    }
    delete data.password;

    const t = await Teacher.create(data);
    const json = t.toJSON();
    // tempPassword is only present when a brand-new account was created.
    if (authUser) json.user = authUser;
    return json;
}

async function update(id, data) {
    const t = await Teacher.findByPk(id);
    if (!t) throw ApiError.notFound('Teacher not found');

    // Backfill the auth_db link for rows created before the binding existed.
    let authUser = null;
    if (!data.userId && !t.userId) {
        authUser = await resolveAuthUser({
            email: data.email || t.email,
            firstName: data.firstName || t.firstName,
            lastName: data.lastName || t.lastName,
            password: data.password,
        });
        if (authUser) data.userId = authUser.id;
    }
    delete data.password;

    await t.update(data);
    const json = t.toJSON();
    if (authUser) json.user = authUser;
    return json;
}

async function remove(id) {
    const t = await Teacher.findByPk(id);
    if (!t) throw ApiError.notFound('Teacher not found');
    await t.destroy();
}

module.exports = { getById, list, create, update, remove };
