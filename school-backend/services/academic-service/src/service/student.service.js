`use strict`

const { Op } = require('sequelize');
const { config, ApiError, redis } = require('@school/shared');
const { Student, SchoolClass, Teacher } = require('../models');

const CACHE_TTL = config.redis.cacheTtl;
const idKey = (id) => `student:${id}`;
const LIST_TAG = 'student:list:*';

/** Single student read goes through Redis (cache-aside). */
async function getById(id) {
    const student = await redis.cacheWrap(idKey(id), CACHE_TTL, async () => {
        const row = await Student.findByPk(id, {
            include: [
                {
                    model: SchoolClass,
                    as: 'class',
                    include: [
                        {
                            model: Teacher,
                            as: 'homeroomTeacher',
                            attributes: ['id', 'teacherCode', 'firstName', 'lastName'],
                        },
                    ],
                },
            ],
        });
        return row ? row.toJSON() : null;
    });
    if (!student) throw ApiError.notFound('Student not found');
    return student;
}

/**
 * Paginated, filterable listing. Cached per filter-combination so identical
 * dashboard queries don't re-hit MySQL within the TTL window.
 */
async function list(query) {
    const { page = 1, limit = 20, level, classId, enrollmentYear, status, search } = query;
    const offset = (page - 1) * limit;

    const where = {};
    if (level) where.level = level;
    if (classId) where.classId = classId;
    if (enrollmentYear) where.enrollmentYear = enrollmentYear;
    if (status) where.status = status;
    if (search) {
        where[Op.or] = [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { studentCode: { [Op.like]: `%${search}%` } },
        ];
    }

    const cacheKey = `student:list:${JSON.stringify({ where, page, limit })}`;
    return redis.cacheWrap(cacheKey, 60, async () => {
        const { rows, count } = await Student.findAndCountAll({
            where,
            limit,
            offset,
            include: [
                {
                    model: SchoolClass,
                    as: 'class',
                    attributes: ['id', 'name', 'academicYear'],
                },
            ],
            order: [['lastName', 'ASC'], ['firstName', 'ASC']],
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

/** classId must point to a real class before we bind the student to it. */
async function assertClassExists(classId) {
    if (classId == null) return;
    const exists = await SchoolClass.count({ where: { id: classId } });
    if (!exists) throw ApiError.notFound(`Class ${classId} not found`);
}

async function create(data) {
    const existing = await Student.findOne({ where: { studentCode: data.studentCode } });
    if (existing) throw ApiError.conflict('studentCode already exists');
    await assertClassExists(data.classId);
    const student = await Student.create(data);
    await redis.invalidate(LIST_TAG);
    return student.toJSON();
}

async function update(id, data) {
    const student = await Student.findByPk(id);
    if (!student) throw ApiError.notFound('Student not found');
    await assertClassExists(data.classId);
    await student.update(data);
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
    return student.toJSON();
}

async function remove(id) {
    const student = await Student.findByPk(id);
    if (!student) throw ApiError.notFound('Student not found');
    await student.destroy();
    await Promise.all([redis.invalidate(idKey(id)), redis.invalidate(LIST_TAG)]);
}

module.exports = { getById, list, create, update, remove };
