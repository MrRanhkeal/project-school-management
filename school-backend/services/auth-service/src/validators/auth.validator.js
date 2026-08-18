'use strict';

const { z } = require('zod');

const registerSchema = z.object({
    email: z.string().email().max(160),
    password: z.string().min(8).max(72),
    fullName: z.string().min(2).max(120),
    role: z.enum(['admin', 'staff', 'teacher', 'student']).optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const refreshSchema = z.object({
    refreshToken: z.string().min(10),
});

const updateUserSchema = z.object({
    email: z.string().email().max(160),
    password: z.string().min(8).max(72),
    fullName: z.string().min(2).max(120).optional(),
    role: z.enum(['admin', 'staff', 'teacher', 'student']).optional(),
    status: z.enum(['active', 'suspended']).optional(),
});

const createUserSchema = z.object({
    email: z.string().email().max(160),
    password: z.string().min(8).max(72),
    fullName: z.string().min(2).max(120),
    role: z.enum(['admin', 'staff', 'teacher', 'student']),
    status: z.enum(['active', 'suspended']).optional(),
});

module.exports = { registerSchema, loginSchema, refreshSchema, updateUserSchema, createUserSchema };

