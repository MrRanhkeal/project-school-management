'use strict';

const { z } = require('zod');

const createSchema = z.object({
    amount: z.coerce.number().positive(),
    currency: z.enum(['USD', 'KHR']).default('USD'),
    // Owner of the payment — verified against academic_db.students before create
    studentId: z.coerce.number().int().positive(),
    payment_id: z.coerce.number().int().positive().optional(),
    billNumber: z.string().max(25).optional(),
    description: z.string().max(500).optional(),
    mobileNumber: z.string().max(25).optional(),
    storeLabel: z.string().max(25).optional(),
    terminalLabel: z.string().max(25).optional(),
}).refine(
    (v) => v.currency !== 'KHR' || Number.isInteger(v.amount),
    { path: ['amount'], message: 'KHR amounts must be whole numbers' },
);

const updateSchema = z.object({
    hash: z.string().max(120).optional(),
    fromAccountId: z.string().max(120).optional(),
    toAccountId: z.string().max(120).optional(),
    externalRef: z.string().max(120).optional(),
    createdDateMs: z.coerce.number().int().positive().optional(),
    acknowledgedDateMs: z.coerce.number().int().positive().optional(),
    receiverBankAccount: z.string().max(120).optional(),
});

const listQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z.enum(['pending', 'completed', 'expired']).optional(),
    currency: z.enum(['USD', 'KHR']).optional(),
    paid: z.coerce.boolean().optional(),
    studentId: z.coerce.number().int().positive().optional(),
});

const md5ParamSchema = z.object({
    md5: z.string().regex(/^[a-f0-9]{32}$/i, 'Invalid md5 hash'),
});

module.exports = { createSchema, updateSchema, listQuerySchema, md5ParamSchema };
