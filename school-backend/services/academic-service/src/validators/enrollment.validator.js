'use strict';

const { z } = require('zod');

const TERMS = ['term1', 'term2', 'term3', 'semester1', 'semester2', 'full_year'];
const STATUSES = ['pending', 'active', 'completed', 'dropped'];

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const academicYear = z.string().regex(/^\d{4}-\d{4}$/);

const createSchema = z.object({
    studentId: z.coerce.number().int().positive(),
    courseId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive().optional(),
    academicYear,
    term: z.enum(TERMS).optional(),
    status: z.enum(STATUSES).optional(),
    enrolledAt: dateOnly.optional(),
    finalGrade: z.coerce.number().min(0).max(100).optional(),
    remarks: z.string().max(255).optional(),
});

// Enroll many students into one course in a single call.
const bulkCreateSchema = z.object({
    courseId: z.coerce.number().int().positive(),
    studentIds: z.array(z.coerce.number().int().positive()).min(1).max(500),
    classId: z.coerce.number().int().positive().optional(),
    academicYear,
    term: z.enum(TERMS).optional(),
    status: z.enum(STATUSES).optional(),
    enrolledAt: dateOnly.optional(),
});

// Self-service join (role: student). No studentId — the API takes it from the
// token — and no status/grade/date, which stay staff-controlled.
const joinSchema = z.object({
    courseId: z.coerce.number().int().positive(),
    academicYear,
    term: z.enum(TERMS).optional(),
});

// studentId / courseId are the identity of the row — re-pointing them would
// silently rewrite history, so they are not updatable (delete + re-create).
const updateSchema = createSchema
    .omit({ studentId: true, courseId: true })
    .extend({
        completedAt: dateOnly.optional(),
        droppedAt: dateOnly.optional(),
    })
    .partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    studentId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    academicYear: academicYear.optional(),
    term: z.enum(TERMS).optional(),
    status: z.enum(STATUSES).optional(),
    search: z.string().max(80).optional(),
});

module.exports = {
    createSchema,
    bulkCreateSchema,
    joinSchema,
    updateSchema,
    listQuerySchema,
    TERMS,
    STATUSES,
};
