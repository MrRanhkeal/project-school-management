'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../service/student.service');
const logErr = require('@school/shared/middleware/logErr');

exports.list = asyncHandler(async (req, res) => {
    try{
        const result = await service.list(req.query);
        const { items, ...meta } = result;
        ok(res, items, meta);
    }catch(err){
        logErr('academic.student',err,res);
        throw err;
    }
});

exports.get = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.getById(req.params.id));
    } catch (err) {
        logErr('academic.student.get', err, res);
        throw err; // let errorHandler send the proper status
    }
});

exports.create = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.create(req.body), undefined, 201);
    } catch (err) {
        logErr('academic.student.create', err, req);
        throw err;
    }
});

exports.update = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.update(req.params.id, req.body));
    } catch (err) {
        logErr('academic.student.update', err, req);
        throw err;
    }
});

exports.remove = asyncHandler(async (req, res) => {
    try {
        await service.remove(req.params.id);
        ok(res, { message: 'Student deleted' });
    } catch (err) {
        logErr('academic.student.remove', err, req);
        throw err;
    }
});
