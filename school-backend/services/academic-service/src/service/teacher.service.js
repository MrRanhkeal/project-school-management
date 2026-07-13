'use strict';

const { Op } = require('sequelize');
const { config, ApiError, redis } = require('@school/shared');
const { Teacher, SchoolClass, Course } = require('../models');

const CACHE_TTL = config.redis.cacheTtl;
const idKey = (id) => `teacher:${id}`;
const LIST_TAG = 'teacher:list:*';

async function getById(id) {
    const teacher = await redis.cacheWrap(idKey(id), CACHE_TTL, async () => {
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
    const cacheKey = `teacher:list:${JSON.stringify({ where, page, limit })}`;
    return redis.cacheWrap(cacheKey, 60, async () => {
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
}

async function create(data) {
    const exists = await Teacher.findOne({ where: { teacherCode: data.teacherCode } });
    if (exists) throw ApiError.conflict('teacherCode already exists');
    const t = await Teacher.create(data);
    await redis.invalidate(LIST_TAG);
    return t.toJSON();
}

async function update(id, data) {
    const t = await Teacher.findByPk(id);
    if (!t) throw ApiError.notFound('Teacher not found');
    await t.update(data);
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
    return t.toJSON();
}

async function remove(id) {
    const t = await Teacher.findByPk(id);
    if (!t) throw ApiError.notFound('Teacher not found');
    await t.destroy();
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
}

module.exports = { getById, list, create, update, remove };
