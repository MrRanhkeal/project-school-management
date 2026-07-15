'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { asyncHandler, ok, validate, internalAuth } = require('@school/shared');
const notificationQueue = require('../queue');

const router = Router();

// One notification event. `type` selects the message template in the
// dispatcher; `to` may be omitted when the recipient can be resolved from
// userId (auth_db) or studentId (academic_db).
const eventSchema = z.object({
    type: z.string().min(1).max(60),
    source: z.string().max(40).optional(),
    to: z.string().email().optional(),
    userId: z.coerce.number().int().positive().optional(),
    studentId: z.coerce.number().int().positive().optional(),
    subject: z.string().max(160).optional(),
    text: z.string().max(2000).optional(),
    data: z.record(z.string(), z.any()).optional(),
});

const dispatchSchema = z.object({
    events: z.array(eventSchema).min(1).max(200),
});

// Service-to-service only: shared-secret header; /api/notifications/internal
// is additionally blocked at the nginx edge so outside callers never reach it.
router.use(internalAuth);

// Fan-in point for auth/academic/record/payment-service: events are enqueued
// and delivered asynchronously by the in-process worker, so callers return
// fast and delivery failures never break their business flow.
router.post(
    '/dispatch',
    validate(dispatchSchema),
    asyncHandler(async (req, res) => {
        const jobs = await notificationQueue.addBulk(
            req.body.events.map((e) => ({ name: e.type, data: e }))
        );
        ok(res, { queued: jobs.length, jobIds: jobs.map((j) => j.id) }, undefined, 202);
    })
);

module.exports = router;
