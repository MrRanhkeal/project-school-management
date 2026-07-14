'use strict';

const { Router } = require('express');
const { validate, internalAuth } = require('@school/shared');
const { z } = require('zod');
const ctrl = require('../controllers/internal.controller');

const resolveSchema = z.object({
    userId: z.coerce.number().int().positive(),
    email: z.string().email().optional(),
    fullName: z.string().min(1).max(120),
    role: z.enum(['student', 'teacher']),
});

const idList = z.array(z.coerce.number().int().positive()).max(2000);
const verifyRefsSchema = z.object({
    studentIds: idList.optional(),
    courseIds: idList.optional(),
    classIds: idList.optional(),
});

const router = Router();

// Service-to-service only: shared-secret header; the nginx gateway has no
// route for /api/academic/*, so it is unreachable from outside anyway.
router.use(internalAuth);

router.post('/profiles/resolve', validate(resolveSchema), ctrl.resolveProfile);

// Cross-service binding for record-service (grades/attendance references):
// FK-style existence check on writes + batch lookups for read-side joins.
router.post('/refs/verify', validate(verifyRefsSchema), ctrl.verifyRefs);
router.get('/students', ctrl.studentsByIds);
router.get('/courses', ctrl.coursesByIds);
router.get('/classes', ctrl.classesByIds);

module.exports = router;
