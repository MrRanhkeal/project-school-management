'use strict';

const { Router } = require('express');
const { validate, authenticate, authorize, rateLimiter } = require('@school/shared');
const ctrl = require('../controllers/enrollment.controller');
const {
    createSchema,
    bulkCreateSchema,
    joinSchema,
    updateSchema,
    listQuerySchema,
} = require('../validators/enrollment.validator');

const router = Router();

router.use(authenticate, rateLimiter());

router.get('/', validate(listQuerySchema, 'query'), ctrl.list);
// Self-service (role: student). Declared before '/:id' so the literal
// '/me' path is not swallowed by the id param route. studentId is read from
// the access token in every one of these, never from the request body.
router.get('/me', authorize('student'), validate(listQuerySchema, 'query'), ctrl.listMine);
router.post('/join', authorize('student'), validate(joinSchema), ctrl.join);
router.delete('/me/:id', authorize('student'), ctrl.dropMine);

router.get('/:id', ctrl.get);
router.post('/', authorize('admin', 'staff'), validate(createSchema), ctrl.create);
router.post('/bulk', authorize('admin', 'staff'), validate(bulkCreateSchema), ctrl.bulkCreate);
router.put('/:id', authorize('admin', 'staff'), validate(updateSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
