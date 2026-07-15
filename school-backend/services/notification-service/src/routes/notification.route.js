'use strict';

const { Router } = require('express');
const { z } = require('zod');
const {
    asyncHandler,
    ok,
    validate,
    authenticate,
    authorize,
    rateLimiter,
} = require('@school/shared');
const { recent } = require('../dispatcher');
const notificationQueue = require('../queue');

const router = Router();

const sendSchema = z.object({
    to: z.string().min(3).optional(),
    subject: z.string().max(160).optional(),
    text: z.string().max(2000).optional(),
    type: z.string().max(60).optional(),
    studentId: z.coerce.number().int().positive().optional(),
});

router.use(authenticate, rateLimiter());

// Enqueue an ad-hoc notification (processed by the in-process worker).
router.post(
    '/send',
    authorize('admin', 'staff', 'teacher'),
    validate(sendSchema),
    asyncHandler(async (req, res) => {
        const job = await notificationQueue.add('manual', req.body);
        ok(res, { queued: true, jobId: job.id }, undefined, 202);
    })
);

// Recent delivery history.
router.get(
    '/recent',
    asyncHandler(async (req, res) => {
        const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
        ok(res, await recent(limit));
    })
);

module.exports = router;
