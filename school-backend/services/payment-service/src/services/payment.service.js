'use strict';

const { BakongKHQR, khqrData, IndividualInfo, MerchantInfo } = require('bakong-khqr');
const { ApiError, paginate, pageMeta } = require('@school/shared');
const { BAKONG } = require('../config/database');
const Payment = require('../models/payment.model');
const academic = require('../clients/academic.client');
const notificationClient = require('../clients/notification.client');

/**
 * Application-level join (Payment.belongsTo(Student, { as: 'student' })
 * equivalent): attach the academic_db student to each payment row.
 */
const _joinStudent = async (items) => {
    const students = await academic.getStudentsByIds(items.map((p) => p.studentId));
    return items.map((p) => ({ ...p, student: students[p.studentId] || null }));
};

const QR_EXPIRE_MS = (Number(process.env.BAKONG_QR_EXPIRE_MINUTES) || 15) * 60 * 1000;

// KHQR uses ISO 4217 numeric codes: USD = 840, KHR = 116
const CURRENCY_CODE = {
    USD: khqrData.currency.usd,
    KHR: khqrData.currency.khr,
};

/** Look up a transaction on the Bakong open API by the QR's md5. */
const _verifyBakongTransaction = async (md5) => {
    const res = await fetch(`${BAKONG.BASE_URL}/check_transaction_by_md5`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${BAKONG.ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ md5 }),
    });
    if (res.status === 401) {
        throw ApiError.internal('Bakong access token rejected — renew BAKONG_ACCESS_TOKEN');
    }
    if (!res.ok && res.status !== 404) {
        throw ApiError.internal(`Bakong API error (HTTP ${res.status})`);
    }
    // { responseCode: 0 | 1, responseMessage, data: { hash, fromAccountId, ... } }
    return res.json();
};

const _markPaid = async (payment, tx = {}) => {
    // Fire-and-forget receipt notification (never blocks settlement).
    notificationClient.notify({
        type: 'payment-completed',
        studentId: payment.studentId ? Number(payment.studentId) : undefined,
        data: {
            paymentId: payment.payment_id,
            amount: payment.amount,
            currency: payment.currency,
            description: payment.description,
        },
    });
    return payment.update({
        paid: 1,
        status: 'completed',
        paidAt: Date.now(),
        bakongHash: tx.hash ?? payment.bakongHash,
        fromAccounId: tx.fromAccountId ?? payment.fromAccounId,
        toAccounId: tx.toAccountId ?? payment.toAccounId,
        externalRef: tx.externalRef ?? payment.externalRef,
        createDateMs: tx.createdDateMs ?? payment.createDateMs,
        acknowDateMs: tx.acknowledgedDateMs ?? payment.acknowDateMs, 
    });
};

exports.generateQR = async ({
    amount,
    currency = 'USD',
    payment_id,
    studentId,
    billNumber,
    description,
    mobileNumber,
    storeLabel,
    terminalLabel,
}) => {
    const currencyCode = CURRENCY_CODE[currency];
    if (!currencyCode) throw ApiError.badRequest(`Unsupported currency: ${currency}`);
    if (currency === 'KHR' && !Number.isInteger(amount)) {
        throw ApiError.badRequest('KHR amounts must be whole numbers');
    }

    // FK-style check against academic_db.students before accepting the write.
    await academic.verifyStudent(studentId);

    const paymentId = payment_id ?? Date.now();
    const expire = Date.now() + QR_EXPIRE_MS;

    const optional = {
        currency: currencyCode,
        amount,
        billNumber: billNumber || `#${paymentId}`,
        mobileNumber,
        storeLabel,
        terminalLabel,
        expirationTimestamp: expire,
    };

    const khqr = new BakongKHQR();
    const useMerchant = BAKONG.MERCHANT_ID && BAKONG.ACQUIRING_BANK;

    let response;
    let metadata;

    if (useMerchant) {
        const merchantInfo = new MerchantInfo(
            BAKONG.ACCOUNT_ID,
            BAKONG.ACCOUNT_NAME,
            BAKONG.CITY,
            BAKONG.MERCHANT_ID,
            BAKONG.ACQUIRING_BANK,
            optional,
        );

        response = khqr.generateMerchant(merchantInfo);
        metadata = merchantInfo; // store full payload
    } else {
        const individualInfo = new IndividualInfo(
            BAKONG.ACCOUNT_ID,
            BAKONG.ACCOUNT_NAME,
            BAKONG.CITY,
            optional,
        );

        response = khqr.generateIndividual(individualInfo);
        metadata = individualInfo; // store full payload
    }

    if (response.status.code !== 0) {
        throw ApiError.internal(
            `KHQR generation failed: ${response.status.message || response.status.errorCode}`
        );
    }

    const payment = await Payment.create({
        payment_id: paymentId,
        studentId,
        qr: response.data.qr,
        md5: response.data.md5,
        expire,
        status: 'pending',
        paid: 0,

        // Only minimal fields here
        currency,
        amount,
        description,
        toAccounId: BAKONG.ACCOUNT_ID,

        // Full KHQR payload stored
        metadata,

        createAt: new Date(),
        createDateMs: Date.now(),
    });

    return payment.toJSON();
};

/**
 * Poll payment status. Asks Bakong whether the QR's transaction exists;
 * marks the payment completed (or expired) accordingly.
 */
exports.checkPayment = async (md5) => {
    const payment = await Payment.findOne({ where: { md5 } });
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.paid) return payment.toJSON();

    const result = await _verifyBakongTransaction(md5);
    if (result && result.responseCode === 0 && result.data) {
        const updated = await _markPaid(payment, result.data);
        return updated.toJSON();
    }

    // Not paid yet — flag the QR as expired once past its window
    if (payment.expire && Date.now() > Number(payment.expire) && payment.status !== 'expired') {
        await payment.update({ status: 'expired' });
    }
    return payment.toJSON();
};

/** Manually settle a payment (e.g. verified out-of-band). Admin only. */
exports.forceComplete = async (md5, fields = {}) => {
    const payment = await Payment.findOne({ where: { md5 } });
    if (!payment) throw ApiError.notFound('Payment not found');
    if (payment.paid) return payment.toJSON();
    const updated = await _markPaid(payment, fields);
    return updated.toJSON();
};

exports.list = async (query) => {
    const { page, limit, offset } = paginate(query);
    const where = {};
    if (query.status) where.status = query.status;
    if (query.currency) where.currency = query.currency;
    if (query.paid !== undefined) where.paid = query.paid ? 1 : 0;
    // hasMany direction: all payments belonging to one student
    if (query.studentId) where.studentId = query.studentId;

    const { rows, count } = await Payment.findAndCountAll({
        where,
        limit,
        offset,
        order: [['id', 'DESC']],
    });
    const items = await _joinStudent(rows.map((r) => r.toJSON()));
    return { items, ...pageMeta(count, { page, limit }) };
};

exports.getById = async (id) => {
    const payment = await Payment.findByPk(id);
    if (!payment) throw ApiError.notFound('Payment not found');
    const [item] = await _joinStudent([payment.toJSON()]);
    return item;
};

/**
 * Internal (service-to-service) batch lookup: payments for a set of students.
 * academic-service uses this to attach `payments` on student reads — the
 * Student.hasMany(Payment, { as: 'payments' }) equivalent — and to enforce
 * onDelete: 'RESTRICT' before deleting a student.
 */
exports.getByStudentIds = async (ids) => {
    const rows = await Payment.findAll({
        where: { studentId: ids },
        attributes: [
            'id', 'payment_id', 'studentId', 'status', 'paid', 'paidAt',
            'currency', 'amount', 'description', 'externalRef', 'createAt',
        ],
        order: [['id', 'DESC']],
        raw: true,
    });
    return rows;
};

