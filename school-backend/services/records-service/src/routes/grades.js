'use strict';

const { Router } = require('express');
const { validate, authenticate, authorize, rateLimiter } = require('@school/shared');
const ctrl = require('../controllers/grades.controller');
const { createSchema, updateSchema, listQuerySchema } = require('../validators/grades.validator');

const router = Router();
router.use(authenticate, rateLimiter());

router.get('/', validate(listQuerySchema, 'query'), ctrl.list);
router.get('/student/:studentId/report', ctrl.studentReport);
router.post('/', authorize('admin', 'teacher'), validate(createSchema), ctrl.create);
router.put('/:id', authorize('admin', 'teacher'), validate(updateSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;