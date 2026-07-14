'use strict';

const { asyncHandler, ok } = require('@school/shared');
const internalService = require('../service/internal.service');
const logErr = require('@school/shared/middleware/logErr');

// POST /api/academic/internal/profiles/resolve  { userId, email, fullName, role }
exports.resolveProfile = asyncHandler(async (req, res) => {
    try{
        const profile = await internalService.resolveProfile(req.body);
        ok(res, profile, undefined, profile.created ? 201 : 200);
    }catch(err){
        logErr('academic.internal.Profile',err,res);
        throw err;
    }
});

const parseIds = (raw) =>
    String(raw || '')
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n > 0);

// GET /api/academic/internal/students?ids=1,2,3
exports.studentsByIds = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        ok(res, ids.length ? await internalService.getStudentsByIds(ids) : []);
    }
    catch(err){
        logErr('academic.internal.studentById',err,res);
        throw res;
    }
});

// GET /api/academic/internal/courses?ids=1,2,3
exports.coursesByIds = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        ok(res, ids.length ? await internalService.getCoursesByIds(ids) : []);
    }
    catch(err){
        logErr('academic.internal.courseById',err,res);
        throw res;
    }
});

// GET /api/academic/internal/classes?ids=1,2,3
exports.classesByIds = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        ok(res, ids.length ? await internalService.getClassesByIds(ids) : []);
    }
    catch(err){
        logErr('academic.internal.classesById',err,res);
    }
});

// POST /api/academic/internal/refs/verify  { studentIds?, courseIds?, classIds? }
exports.verifyRefs = asyncHandler(async (req, res) => {
    ok(res, await internalService.verifyRefs(req.body));
});
