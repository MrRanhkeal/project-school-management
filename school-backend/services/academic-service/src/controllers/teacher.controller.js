'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../service/teacher.service');

exports.list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await service.list(req.query);
    ok(res, items, meta);
});
exports.get = asyncHandler(async (req, res) => ok(res, await service.getById(req.params.id)));
exports.create = asyncHandler(async (req, res) =>
    ok(res, await service.create(req.body), undefined, 201)
);
exports.update = asyncHandler(async (req, res) =>
    ok(res, await service.update(req.params.id, req.body))
);
exports.remove = asyncHandler(async (req, res) => {
    await service.remove(req.params.id);
    ok(res, { message: 'Teacher deleted' });
});
