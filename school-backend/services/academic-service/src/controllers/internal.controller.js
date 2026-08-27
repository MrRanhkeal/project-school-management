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

// GET /api/academic/internal/enrollments?ids=1,2,3
exports.enrollmentsByIds = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        ok(res, ids.length ? await internalService.getEnrollmentsByIds(ids) : []);
    }
    catch(err){
        logErr('academic.internal.enrollmentById',err,res);
        throw err;
    }
});

// GET /api/academic/internal/enrollments/by-student?ids=1,2,3&status=active
exports.enrollmentsByStudent = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        if (!ids.length) return ok(res, {});
        const rows = await internalService.getEnrollmentsByStudentIds(ids, {
            status: req.query.status,
        });
        const byStudent = {};
        for (const e of rows) {
            (byStudent[e.studentId] ??= []).push(e);
        }
        ok(res, byStudent);
    }
    catch(err){
        logErr('academic.internal.enrollmentByStudent',err,res);
        throw err;
    }
});

// POST /api/academic/internal/enrollments/verify  { studentId, courseId, ... }
exports.verifyEnrollment = asyncHandler(async (req, res) => {
    try{
        ok(res, await internalService.verifyEnrollment(req.body));
    }
    catch(err){
        logErr('academic.internal.verifyEnrollment',err,res);
        throw err;
    }
});

// POST /api/academic/internal/refs/verify  { studentIds?, courseIds?, classIds?, enrollmentIds? }
exports.verifyRefs = asyncHandler(async (req, res) => {
    ok(res, await internalService.verifyRefs(req.body));
});
