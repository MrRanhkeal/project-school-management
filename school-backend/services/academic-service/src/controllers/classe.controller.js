'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../service/classe.service');
const logErr = require('@school/shared/middleware/logErr');

exports.list = asyncHandler(async (req, res) => {
    try {
        const { items, ...meta } = await service.list(req.query);
        ok(res, items, meta);
    } catch (err) {
        logErr('academic.classe.list', err, res);
        throw err;
    }
});
exports.get = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.getById(req.params.id))
    }
    catch (err) {
        logErr('academic.classe.get', err, res);
        throw err;
    }
});

exports.create = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.create(req.body), undefined, 201)
    } catch (err) {
        logErr('academic.classe.create', res, err);
        throw err;
    }
});
exports.update = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.update(req.params.id, req.body))
    } catch (err) {
        logErr('academic.class.update', err, res);
        throw err;
    }
});

exports.remove = asyncHandler(async (req, res) => {
    try{
        await service.remove(req.params.id);
        ok(res, { message: 'Class deleted' });
    }catch(err){
        logErr('academic.classe.remove',err,res);
        throw err;
    }
});

