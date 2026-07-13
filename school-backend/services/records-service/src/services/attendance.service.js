'use strict';

const { Op } = require('sequelize');
const { queue } = require('@school/shared');
const Attendance = require('../models/attendance.model');

// Producer handle. Worker (attendance-worker) consumes from the same queue.
const attendanceQueue = queue.createQueue('attendance');

/**
 * Enqueue a batch of attendance records instead of writing inline. Returns
 * immediately so the teacher's UI is snappy even when submitting a full roll;
 * the worker persists durably and fans out absence notifications.
 */
async function mark({ date, records }, markedBy) {
    const job = await attendanceQueue.add(
        'mark-batch',
        { date, records, markedBy },
        { jobId: undefined }
    );
    return { queued: true, jobId: job.id, count: records.length };
}

/** Paginated history query (reads the durable table). */
async function list(query) {
    const {
        page = 1,
        limit = 50,
        studentId,
        classId,
        courseId,
        status,
        dateFrom,
        dateTo,
    } = query;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (courseId) where.courseId = courseId;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date[Op.gte] = dateFrom;
        if (dateTo) where.date[Op.lte] = dateTo;
    }

    const { rows, count } = await Attendance.findAndCountAll({
        where,
        limit,
        offset: (page - 1) * limit,
        order: [['date', 'DESC'], ['student_id', 'ASC']],
    });
    return {
        items: rows.map((r) => r.toJSON()),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit) || 1,
    };
}

/** Per-student attendance summary (counts by status), optionally date-bounded. */
async function studentSummary(studentId, { dateFrom, dateTo } = {}) {
    const where = { studentId };
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date[Op.gte] = dateFrom;
        if (dateTo) where.date[Op.lte] = dateTo;
    }

    const rows = await Attendance.findAll({
        where,
        attributes: [
            'status',
            [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('status')), 'count'],
        ],
        group: ['status'],
        raw: true,
    });

    const summary = { present: 0, absent: 0, late: 0, excused: 0 };
    rows.forEach((r) => {
        summary[r.status] = Number(r.count);
    });
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    summary.total = total;
    summary.attendanceRate = total ? Math.round(((summary.present + summary.late) / total) * 1000) / 10 : null;
    return summary;
}

module.exports = { mark, list, studentSummary };
