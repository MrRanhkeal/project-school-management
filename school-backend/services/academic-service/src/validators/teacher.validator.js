'use strict';

const { z } = require('zod');

const createSchema = z.object({
    userId: z.coerce.number().int().positive().optional(),
    teacherCode: z.string().min(3).max(20),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    email: z.string().email().optional(),
    // Sets the linked auth account's password on creation (requires email);
    // never stored in academic_db.
    password: z.string().min(8).max(72).optional(),
    phone: z.string().max(30).optional(),
    department: z.string().max(80).optional(),
    specialization: z.string().max(120).optional(),
    hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.enum(['active', 'on_leave', 'retired']).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    department: z.string().max(80).optional(),
    status: z.enum(['active', 'on_leave', 'retired']).optional(),
    search: z.string().max(80).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };

