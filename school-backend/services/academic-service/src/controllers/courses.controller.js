'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../service/course.service');
const logErr = require('@school/shared/middleware/logErr');

exports.list = asyncHandler(async (req, res) => {
    try {
        const { items, ...meta } = await service.list(req.query);
        ok(res, items, meta);
    }
    catch (err) {
        logErr('academic.course.list', err, res);
        throw err;
    }
});
exports.get = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.getById(req.params.id));
    } catch (err) {
        logErr('academic.coures.get', err, res);
        throw err;
    }
});
exports.create = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.create(req.body), undefined, 201);
    }
    catch (err) {
        logErr('academic.course.create', err, res);
        throw err;
    }
});
exports.update = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.update(req.params.id, req.body));
    } catch (err) {
        logErr('academic.course.update', err, res);
        throw err;
    }
});
exports.remove = asyncHandler(async (req, res) => {
    try{
        await service.remove(req.params.id);
        ok(res, { message: 'Course deleted' });
    }catch(err){
        logErr('academic.course.remove',err,res);
        throw err;
    }
});
