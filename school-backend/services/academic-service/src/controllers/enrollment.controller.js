'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../service/enrollment.service');
const logErr = require('@school/shared/middleware/logErr');

exports.list = asyncHandler(async (req, res) => {
    try {
        // validate(..., 'query') publishes the coerced query on
        // req.validatedQuery — Express 5's req.query is a read-only getter
        // and still holds raw strings.
        const { items, ...meta } = await service.list(req.validatedQuery || req.query);
        ok(res, items, meta);
    }
    catch (err) {
        logErr('academic.enrollment.list', err, res);
        throw err;
    }
});

exports.get = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.getById(req.params.id));
    } catch (err) {
        logErr('academic.enrollment.get', err, res);
        throw err;
    }
});

exports.create = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.create(req.body), undefined, 201);
    }
    catch (err) {
        logErr('academic.enrollment.create', err, res);
        throw err;
    }
});

exports.bulkCreate = asyncHandler(async (req, res) => {
    try {
        const result = await service.bulkCreate(req.body);
        const { created, ...meta } = result;
        ok(res, created, meta, 201);
    }
    catch (err) {
        logErr('academic.enrollment.bulkCreate', err, res);
        throw err;
    }
});

exports.listMine = asyncHandler(async (req, res) => {
    try {
        const { items, ...meta } = await service.listMine(
            req.user,
            req.validatedQuery || req.query,
        );
        ok(res, items, meta);
    } catch (err) {
        logErr('academic.enrollment.listMine', err, res);
        throw err;
    }
});

exports.join = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.joinSelf(req.user, req.body), undefined, 201);
    } catch (err) {
        logErr('academic.enrollment.join', err, res);
        throw err;
    }
});

exports.dropMine = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.dropSelf(req.user, req.params.id));
    } catch (err) {
        logErr('academic.enrollment.dropMine', err, res);
        throw err;
    }
});

exports.update = asyncHandler(async (req, res) => {
    try {
        ok(res, await service.update(req.params.id, req.body));
    } catch (err) {
        logErr('academic.enrollment.update', err, res);
        throw err;
    }
});

exports.remove = asyncHandler(async (req, res) => {
    try {
        await service.remove(req.params.id);
        ok(res, { message: 'Enrollment deleted' });
    } catch (err) {
        logErr('academic.enrollment.remove', err, res);
        throw err;
    }
});
