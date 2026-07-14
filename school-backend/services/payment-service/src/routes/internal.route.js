'use strict';

const { Router } = require('express');
const { internalAuth } = require('@school/shared');
const ctrl = require('../controllers/internal.controller');

const router = Router();

// Service-to-service only: shared-secret header; the nginx gateway proxies
// /api/payments to this service, but these internal paths are only called
// with the x-internal-token secret, so outside callers are rejected.
router.use(internalAuth);

// Cross-service binding for academic-service (student -> payments join):
// batch lookup used to attach `payments` on student reads and to block
// deleting a student who still has payment history (RESTRICT).
router.get('/by-student', ctrl.paymentsByStudentIds);

module.exports = router;
