
'use strict';

const { Router } = require('express');
const { validate, authenticate, authorize, rateLimiter } = require('@school/shared');
const ctrl = require('../controllers/attendance.controller');
const { markSchema, listQuerySchema } = require('../validators/attendance.validator');

const router = Router();
router.use(authenticate, rateLimiter());

router.post('/mark', authorize('admin', 'staff', 'teacher'), validate(markSchema), ctrl.mark);
router.get('/', validate(listQuerySchema, 'query'), ctrl.list);
router.get('/student/:studentId/summary', ctrl.studentSummary);

module.exports = router;
