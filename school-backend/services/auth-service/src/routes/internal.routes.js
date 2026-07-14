'use strict';

const { Router } = require('express');
const { validate, internalAuth } = require('@school/shared');
const { z } = require('zod');
const ctrl = require('../controllers/internal.controller');

const resolveSchema = z.object({
    email: z.string().email(),
    fullName: z.string().min(1).max(120),
    role: z.enum(['admin', 'staff', 'teacher', 'student']).optional(),
    password: z.string().min(8).max(72).optional(),
});

const router = Router();

// Service-to-service only: shared-secret header + blocked at the nginx edge.
router.use(internalAuth);

router.post('/users/resolve', validate(resolveSchema), ctrl.resolveUser);
router.get('/users', ctrl.usersByIds);

module.exports = router;
