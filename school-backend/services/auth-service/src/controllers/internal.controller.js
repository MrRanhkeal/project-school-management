'use strict';

const { asyncHandler, ok } = require('@school/shared');
const internalService = require('../services/internal.service');
const logErr = require('@school/shared/middleware/logErr');
// POST /api/auth/internal/users/resolve  { email, fullName, role }
exports.resolveUser = asyncHandler(async (req, res) => { 
    try{
        const user = await internalService.resolveUser(req.body);
        ok(res, user, undefined, user.created ? 201 : 200);
    }
    catch(err){
        logErr('auth.internal.internal',err,res);
        throw err;
    }
});

// GET /api/auth/internal/users?ids=1,2,3
exports.usersByIds = asyncHandler(async (req, res) => {
    try{
        const ids = String(req.query.ids || '')
            .split(',')
            .map((s) => parseInt(s, 10))
            .filter((n) => Number.isInteger(n) && n > 0);
        const users = ids.length ? await internalService.getUsersByIds(ids) : [];
        ok(res, users);
    }
    catch(err){
        logErr('auth.internal.getUserById',err,res);
        throw err;
    }
});
