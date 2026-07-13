'use strict';

const { config, ApiError, redis } = require('@school/shared');
const { SchoolClass, Teacher, Student, Course } = require('../models');

const CACHE_TTL = config.redis.cacheTtl;
const idKey = (id) => `class:${id}`;
const LIST_TAG = 'class:list:*';

async function getById(id) {
    const row = await redis.cacheWrap(idKey(id), CACHE_TTL, async () => {
        const r = await SchoolClass.findByPk(id, {
            include: [
                {
                    model: Teacher,
                    as: 'homeroomTeacher',
                    attributes: ['id', 'teacherCode', 'firstName', 'lastName', 'department'],
                },
                {
                    model: Student,
                    as: 'students',
                    attributes: ['id', 'studentCode', 'firstName', 'lastName', 'status'],
                },
                {
                    model: Course,
                    as: 'courses',
                    attributes: ['id', 'code', 'title', 'teacherId', 'status'],
                },
            ],
        });
        return r ? r.toJSON() : null;
    });
    if (!row) throw ApiError.notFound('Class not found');
    return row;
}

async function list(query) {
    const { page = 1, limit = 20, level, academicYear, status } = query;
    const where = {};
    if (level) where.level = level;
    if (academicYear) where.academicYear = academicYear;
    if (status) where.status = status;
    const cacheKey = `class:list:${JSON.stringify({ where, page, limit })}`;
    return redis.cacheWrap(cacheKey, 60, async () => {
        const { rows, count } = await SchoolClass.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            include: [
                {
                    model: Teacher,
                    as: 'homeroomTeacher',
                    attributes: ['id', 'teacherCode', 'firstName', 'lastName'],
                },
            ],
            order: [['name', 'ASC']],
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

/** homeroomTeacherId must point to a real teacher before we bind it. */
async function assertTeacherExists(teacherId) {
    if (teacherId == null) return;
    const exists = await Teacher.count({ where: { id: teacherId } });
    if (!exists) throw ApiError.notFound(`Teacher ${teacherId} not found`);
}

async function create(data) {
    await assertTeacherExists(data.homeroomTeacherId);
    const c = await SchoolClass.create(data);
    await redis.invalidate(LIST_TAG);
    return c.toJSON();
}

async function update(id, data) {
    const c = await SchoolClass.findByPk(id);
    if (!c) throw ApiError.notFound('Class not found');
    await assertTeacherExists(data.homeroomTeacherId);
    await c.update(data);
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
    return c.toJSON();
}

async function remove(id) {
    const c = await SchoolClass.findByPk(id);
    if (!c) throw ApiError.notFound('Class not found');
    await c.destroy();
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
}

module.exports = { getById, list, create, update, remove };
