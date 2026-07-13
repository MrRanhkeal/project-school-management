'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../services/grades.service');

exports.list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await service.list(req.query);
    ok(res, items, meta);
});
exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.create(req.body), undefined, 201)
);
exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.update(req.params.id, req.body))
);
exports.remove = asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    ok(res, { message: 'Grade deleted' });
});
exports.studentReport = asyncHandler(async (req, res) =>
    ok(res, await service.studentReport(req.params.studentId, req.query.term))
);
