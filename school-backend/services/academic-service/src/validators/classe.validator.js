'use strict';

const { z } = require('zod');

const LEVELS = ['primary', 'secondary', 'high_school', 'college'];

const createSchema = z.object({
    name: z.string().min(1).max(80),
    level: z.enum(LEVELS),
    gradeYear: z.coerce.number().int().min(1).max(16).optional(),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/),
    homeroomTeacherId: z.coerce.number().int().positive().optional(),
    capacity: z.coerce.number().int().min(1).max(200).optional(),
    roomNumber: z.string().max(20).optional(),
    status: z.enum(['active', 'archived']).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    level: z.enum(LEVELS).optional(),
    academicYear: z.string().regex(/^\d{4}-\d{4}$/).optional(),
    status: z.enum(['active', 'archived']).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
