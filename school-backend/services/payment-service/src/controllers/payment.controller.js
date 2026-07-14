const { asyncHandler, ok } = require("@school/shared");
const service = require('../services/payment.service');
const logErr = require("../../../../shared/middleware/logErr");

exports.list = asyncHandler(async (req,res)=>{
    try{
        const { items, ...data } = await service.list(req.query);
        ok(res, items, data);
    }catch(err){
        logErr('payment.paymet.list',err,res);
        throw err;
    }
});

exports.get = asyncHandler(async(req,res)=> {
    try{
        ok(res, await service.getById(req.params.id));
    }catch(err){
        logErr('payment.paymet.get', err, res);
        throw err;
    }
});

// Create a payment: generates the Bakong KHQR and returns { qr, md5, expire, ... }
exports.create = asyncHandler( async (req,res)=>{
    try{
        ok(res, await service.generateQR(req.body), undefined, 201);
    }catch(err){
        logErr('payment.paymet.create', err, res);
        throw err;
    }
});

// Poll Bakong for the transaction; marks the payment completed/expired
exports.check = asyncHandler(async (req,res)=> {
    try{
        ok(res, await service.checkPayment(req.params.md5));
    }catch(err){
        logErr('payment.paymet.check', err, res);
        throw err;
    }
});

exports.forceComplete = asyncHandler(async (req,res)=>{
    try{
        ok(res, await service.forceComplete(req.params.md5, req.body))
    }catch(err){
        logErr('payment.paymet.forceComplete', err, res);
        throw err;
    }
});
