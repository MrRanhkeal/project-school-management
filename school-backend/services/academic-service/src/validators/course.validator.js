'use strict';

const { z } = require('zod');

const LEVELS = ['primary', 'secondary', 'high_school', 'college'];

const createSchema = z.object({
    code: z.string().min(2).max(20),
    title: z.string().min(2).max(140),
    description: z.string().max(5000).optional(),
    level: z.enum(LEVELS),
    credits: z.coerce.number().min(0).max(20).optional(),
    department: z.string().max(80).optional(),
    teacherId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
    status: z.enum(['open', 'closed', 'archived']).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    level: z.enum(LEVELS).optional(),
    teacherId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    status: z.enum(['open', 'closed', 'archived']).optional(),
    search: z.string().max(80).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
