'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../services/grades.service');
const logErr = require('@school/shared/middleware/logErr');

exports.list = asyncHandler(async (req, res) => {
    try{
        const { items, ...meta } = await service.list(req.query);
        ok(res, items, meta);
    }catch(err){
        logErr('record.grades.list', err, res);
        throw err;
    }
});
exports.create = asyncHandler(async (req, res) =>{
    try{
        ok(res, await service.create(req.body), undefined, 201);
    }catch(err){
        logErr('record.grades.list', err, res);
        throw err;
    }
});
exports.update = asyncHandler(async (req, res) =>{
    try{
        ok(res, await service.update(req.params.id, req.body));
    }catch(err){
        logErr('record.grades.update', err, res);
        throw err;
    }
});
exports.remove = asyncHandler(async (req, res) => {
    try{
        await service.remove(req.params.id);
        ok(res, { message: 'Grade deleted' });
    }catch(err){
        logErr('record.grades.remove', err, res);
        throw err;
    }
});
exports.studentReport = asyncHandler(async (req, res) =>{
    try{
        ok(res, await service.studentReport(req.params.studentId, req.query.term));
    }catch(err){
        logErr('record.grades.studentReport', err, res);
        throw err;
    }
});
