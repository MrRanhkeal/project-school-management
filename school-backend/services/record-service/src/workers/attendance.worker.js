'use strict';

const { logger, queue } = require('@school/shared');
const Attendance = require('../models/attendance.model');
const notificationClient = require('../clients/notification.client');

/**
 * Consumer for the 'attendance' queue (producer: attendance.service.mark).
 * References were already verified against academic-service before the job
 * was enqueued, so this only has to persist. Upsert on the unique
 * (student_id, course_id, date) key makes re-marking idempotent: submitting
 * the same roll twice updates status/note instead of duplicating rows.
 */
function start() {
    const worker = queue.createWorker('attendance', async (job) => {
        const { date, records, markedBy } = job.data;
        const rows = records.map((r) => ({
            studentId: r.studentId,
            classId: r.classId ?? null,
            courseId: r.courseId ?? null,
            status: r.status,
            note: r.note ?? null,
            markedBy: markedBy || null,
            date,
        }));
        await Attendance.bulkCreate(rows, {
            updateOnDuplicate: ['status', 'note', 'markedBy', 'classId', 'updatedAt'],
        });
        logger.info('Attendance batch persisted', {
            jobId: String(job.id),
            date,
            count: String(rows.length),
        });

        // Fan out absence notifications (fire-and-forget, one batched call).
        const absences = rows.filter((r) => r.status === 'absent');
        if (absences.length) {
            notificationClient.notify(
                absences.map((r) => ({
                    type: 'attendance-absence',
                    studentId: Number(r.studentId),
                    data: { date, note: r.note || undefined },
                }))
            );
        }

        return { written: rows.length };
    });
    return worker;
}

module.exports = { start };
