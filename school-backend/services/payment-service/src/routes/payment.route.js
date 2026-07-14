
const { Router } = require('express');
const {authenticate, rateLimiter, validate, authorize,} = require('@school/shared');
const ctrl = require('../controllers/payment.controller');
const {createSchema, updateSchema, listQuerySchema, md5ParamSchema} = require('../validator/payment.validator');

const router = Router();
router.use(authenticate, rateLimiter());

router.get('/',validate(listQuerySchema, 'query'),ctrl.list);
router.post('/',authorize(),validate(createSchema),ctrl.create);
router.get('/check/:md5',validate(md5ParamSchema, 'params'),ctrl.check);
router.post('/force-complete/:md5',authorize(),validate(md5ParamSchema, 'params'),validate(updateSchema),ctrl.forceComplete);
router.get('/:id',ctrl.get);

module.exports = router;
