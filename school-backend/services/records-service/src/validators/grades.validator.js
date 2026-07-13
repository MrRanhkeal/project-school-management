'use strict'; //handle err 

const { z } = require('zod');

const createSchema = z.object({
    studentId: z.coerce.number().int().positive(),
    courseId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive().optional(),
    term: z.string().min(1).max(20),
    assessment: z.string().max(80).optional(),
    score: z.coerce.number().min(0).max(1000),
    maxScore: z.coerce.number().min(1).max(1000).optional(),
    weight: z.coerce.number().min(0).max(100).optional(),
    letterGrade: z.string().max(3).optional(),
    remarks: z.string().max(255).optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
    studentId: z.coerce.number().int().positive().optional(),
    courseId: z.coerce.number().int().positive().optional(),
    term: z.string().max(20).optional(),
});

module.exports = { createSchema, updateSchema, listQuerySchema };
