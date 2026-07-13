'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../services/attendance.service');

exports.mark = asyncHandler(async (req, res) => {
    const result = await service.mark(req.body, req.user?.sub);
    ok(res, result, undefined, 202); // Accepted — processed async
});

exports.list = asyncHandler(async (req, res) => {
    const { items, ...meta } = await service.list(req.query);
    ok(res, items, meta);
});

exports.studentSummary = asyncHandler(async (req, res) => {
    const summary = await service.studentSummary(req.params.studentId, req.query);
    ok(res, summary);
});
