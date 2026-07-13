'use strict';

const { asyncHandler, ok } = require('@school/shared');
const authService = require('../services/auth.service');
const logErr = require('@school/shared/middleware/logErr');
exports.register = asyncHandler(async (req, res) => {
    try {
        const user = await authService.register(req.body);
        ok(res, user, undefined, 201);
    }
    catch (err) {
        await logErr('auth.register', err, req);
        throw err; // let errorHandler send the proper status (e.g. 409)
    }
});

exports.login = asyncHandler(async (req, res) => {
    try {
        const result = await authService.login(req.body);
        ok(res, result);
    }
    catch (err) {
        await logErr('auth.login', err, req);
        throw err;
    }
});

exports.refresh = asyncHandler(async (req, res) => {
    const tokens = await authService.refresh(req.body);
    ok(res, tokens);
});

exports.logout = asyncHandler(async (req, res) => {
    await authService.logout(req.body);
    ok(res, { message: 'Logged out' });
});

exports.userList = asyncHandler(async (req, res) => {
    try {
        const { users, meta } = await authService.userList(req.query);
        ok(res, users, meta);
    }
    catch (err) {
        await logErr('auth.userList', err, req);
        throw err;
    }
});

exports.me = asyncHandler(async (req, res) => {
    try {
        const user = await authService.me(req.user.sub);
        ok(res, user);
    }
    catch (err) {
        await logErr('auth.me', err, req);
        throw err;
    }
});

