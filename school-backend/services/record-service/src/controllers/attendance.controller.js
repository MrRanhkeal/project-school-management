'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../services/attendance.service');
const logErr = require('@school/shared/middleware/logErr');

exports.mark = asyncHandler(async (req, res) => {
    try{
        const result = await service.mark(req.body, req.user?.sub);
        ok(res, result, undefined, 202); // Accepted — processed async
    }
    catch(err){
        logErr('record.attendance.mark',err,res);
        throw err;
    }
});

exports.list = asyncHandler(async (req, res) => {
    try{
        const { items, ...meta } = await service.list(req.query);
        ok(res, items, meta);
    }catch(err){
        logErr('record.attendance.list', err, res);
        throw err;
    }
});

exports.studentSummary = asyncHandler(async (req, res) => {
    try{
        const summary = await service.studentSummary(req.params.studentId, req.query);
        ok(res, summary);
    }catch(err){
        logErr('record.attendance.studentSummary', err, res);
        throw err;
    }
});
