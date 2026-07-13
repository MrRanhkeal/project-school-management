'use strict';

const { Op } = require('sequelize');
const { config, ApiError, redis } = require('@school/shared');
const { Course, Teacher, SchoolClass } = require('../models');

const courseIncludes = [
    {
        model: Teacher,
        as: 'teacher',
        attributes: ['id', 'teacherCode', 'firstName', 'lastName', 'department'],
    },
    {
        model: SchoolClass,
        as: 'class',
        attributes: ['id', 'name', 'level', 'academicYear'],
    },
];

const CACHE_TTL = config.redis.cacheTtl;
const idKey = (id) => `course:${id}`;
const LIST_TAG = 'course:list:*';

async function getById(id) {
    const row = await redis.cacheWrap(idKey(id), CACHE_TTL, async () => {
        const r = await Course.findByPk(id, { include: courseIncludes });
        return r ? r.toJSON() : null;
    });
    if (!row) throw ApiError.notFound('Course not found');
    return row;
}

async function list(query) {
    const { page = 1, limit = 20, level, teacherId, classId, status, search } = query;
    const where = {};
    if (level) where.level = level;
    if (teacherId) where.teacherId = teacherId;
    if (classId) where.classId = classId;
    if (status) where.status = status;
    if (search) {
        where[Op.or] = [
            { title: { [Op.like]: `%${search}%` } },
            { code: { [Op.like]: `%${search}%` } },
        ];
    }
    const cacheKey = `course:list:${JSON.stringify({ where, page, limit })}`;
    return redis.cacheWrap(cacheKey, 60, async () => {
        const { rows, count } = await Course.findAndCountAll({
            where,
            limit,
            offset: (page - 1) * limit,
            include: courseIncludes,
            order: [['code', 'ASC']],
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

/** teacherId / classId must point to real rows before we bind them. */
async function assertRelationsExist({ teacherId, classId }) {
    if (teacherId != null) {
        const found = await Teacher.count({ where: { id: teacherId } });
        if (!found) throw ApiError.notFound(`Teacher ${teacherId} not found`);
    }
    if (classId != null) {
        const found = await SchoolClass.count({ where: { id: classId } });
        if (!found) throw ApiError.notFound(`Class ${classId} not found`);
    }
}

async function create(data) {
    const exists = await Course.findOne({ where: { code: data.code } });
    if (exists) throw ApiError.conflict('Course code already exists');
    await assertRelationsExist(data);
    const c = await Course.create(data);
    await redis.invalidate(LIST_TAG);
    return c.toJSON();
}

async function update(id, data) {
    const c = await Course.findByPk(id);
    if (!c) throw ApiError.notFound('Course not found');
    await assertRelationsExist(data);
    await c.update(data);
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
    return c.toJSON();
}

async function remove(id) {
    const c = await Course.findByPk(id);
    if (!c) throw ApiError.notFound('Course not found');
    await c.destroy();
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
}

module.exports = { getById, list, create, update, remove };
