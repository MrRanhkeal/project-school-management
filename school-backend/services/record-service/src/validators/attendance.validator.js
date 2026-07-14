'use strict';

const { z } = require('zod');

const STATUSES = ['present', 'absent', 'late', 'excused'];
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const recordSchema = z.object({
    studentId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    status: z.enum(STATUSES),
    note: z.string().max(255).optional(),
});

// Bulk mark: one date, many student records (a teacher submitting a class roll).
const markSchema = z.object({
    date: dateStr,
    records: z.array(recordSchema).min(1).max(2000),
});

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    studentId: z.coerce.number().int().positive().optional(),
    classId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    status: z.enum(STATUSES).optional(),
    dateFrom: dateStr.optional(),
    dateTo: dateStr.optional(),
});

module.exports = { markSchema, listQuerySchema };
