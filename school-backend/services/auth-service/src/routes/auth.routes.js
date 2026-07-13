
'use strict';

const { Router } = require('express');
const { validate, authenticate, authorize, rateLimiter } = require('@school/shared');
const ctrl = require('../controllers/auth.controller');
const {
    registerSchema,
    loginSchema,
    refreshSchema,
} = require('../validators/auth.validator');

const router = Router();

// Tighter limit on credential endpoints to blunt brute-force attempts.
const authLimiter = rateLimiter({ keyPrefix: 'auth', max: 20, windowMs: 60000 });

router.post('/register', authLimiter, validate(registerSchema), ctrl.register);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', validate(refreshSchema), ctrl.refresh);
router.post('/logout', validate(refreshSchema), ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.get('/users', authenticate, authorize('admin'), ctrl.userList);

module.exports = router;

