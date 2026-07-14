'use strict';

const { z } = require('zod');

const LEVELS = ['primary', 'secondary', 'high_school', 'college'];

const createSchema = z.object({
    userId: z.coerce.number().int().positive().optional(),
    studentCode: z.string().min(3).max(20),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    level: z.enum(LEVELS),
    gradeYear: z.coerce.number().int().min(1).max(16).optional(),
    classId: z.coerce.number().int().positive().optional(),
    enrollmentYear: z.coerce.number().int().min(2000).max(2100),
    guardianName: z.string().max(120).optional(),
    guardianPhone: z.string().max(30).optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(72).optional(),
});

// All fields optional on update.
const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    level: z.enum(LEVELS).optional(),
    classId: z.coerce.number().int().positive().optional(),
    enrollmentYear: z.coerce.number().int().optional(),
    status: z.enum(['enrolled', 'graduated', 'withdrawn', 'suspended']).optional(),
    search: z.string().max(80).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
