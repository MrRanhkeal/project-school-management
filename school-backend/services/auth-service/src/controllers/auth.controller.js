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
    try {
        const tokens = await authService.refresh(req.body);
        ok(res, tokens);
    } catch (err) {
        logErr('auth.refresh', err, res);
        throw err;
    }
});

exports.logout = asyncHandler(async (req, res) => {
    try {
        await authService.logout(req.body);
        ok(res, { message: 'Logged out' });
    } catch (err) {
        logErr('auth.logout', err, res);
        throw err;
    }
});

exports.userList = asyncHandler(async (req, res) => {
    try {
        const result = await authService.userList(req.query);
        ok(res, result.users, result.meta);
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
// exports.updateUser == asyncHandler(async (req, res,next) => {
//     try {
//         const user = await userService.updateUser(
//             req.params.id,
//             req.body
//         );

//         res.json({
//             success: true,
//             data: user,
//         });
//     } catch (err) {
//         next(err);
//     }
// });
exports.updateUser = asyncHandler(async (req, res) => {
    try {
        const user = await authService.updateUser(req.params.id, req.body);
        ok(res, user);
    }
    catch (err) {
        await logErr('auth.updateUser', err, req);
        throw err;
    }
});

exports.deleteUser = asyncHandler(async (req, res) => {
    try {
        const result = await authService.deleteUser(req.params.id);
        ok(res, result);
    }
    catch (err) {
        await logErr('auth.deleteUser', err, req);
        throw err;
    }
});

exports.createUser = asyncHandler(async (req, res) => {
    try {
        const user = await authService.createUser(req.body);
        ok(res, user, undefined, 201);
    }
    catch (err) {
        await logErr('auth.createUser', err, req);
        throw err;
    }
});