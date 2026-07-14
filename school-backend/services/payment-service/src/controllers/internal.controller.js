'use strict';

const { asyncHandler, ok } = require('@school/shared');
const service = require('../services/payment.service'); 
const logErr = require('../../../../shared/middleware/logErr');

const parseIds = (raw) =>
    String(raw || '')
        .split(',')
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n > 0);

// GET /api/payments/internal/by-student?ids=1,2,3
// Batch lookup academic-service uses for the Student.hasMany(Payment) join
// and for the onDelete: 'RESTRICT' guard before deleting a student.
exports.paymentsByStudentIds = asyncHandler(async (req, res) => {
    try{
        const ids = parseIds(req.query.ids);
        ok(res, ids.length ? await service.getByStudentIds(ids) : []);
    }catch(err){
        logErr('payment.internal.paymentsByStudentIds',err,res);
        throw err;
    }
});
