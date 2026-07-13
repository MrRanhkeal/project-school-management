'use strict';

const { Router } = require('express');
const { validate, authenticate, authorize, rateLimiter } = require('@school/shared');
const ctrl = require('../controllers/classe.controller');
const { createSchema, updateSchema, listQuerySchema } = require('../validators/classe.validator');

const router = Router();
router.use(authenticate, rateLimiter());

router.get('/', validate(listQuerySchema, 'query'), ctrl.list);
router.get('/:id', ctrl.get);
router.post('/', authorize('admin', 'staff'), validate(createSchema), ctrl.create);
router.put('/:id', authorize('admin', 'staff'), validate(updateSchema), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;