`use strict`
const sequilize = require("../config/database");
const { DataTypes } = require('sequelize');

const Attendance = sequilize.define(
    `Attendance`,
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
        classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
        courseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
        date: { type: DataTypes.DATEONLY, allowNull: false },
        status: {
            type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
            allowNull: false,
            defaultValue: 'present',
        },
        markedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, // teacher/user id
        note: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
        tableName: 'attendance',
        indexes: [
            { unique: true, fields: ['student_id', 'course_id', 'date'] },
            { fields: ['date'] },
            { fields: ['class_id', 'date'] },
            { fields: ['student_id', 'date'] },
            { fields: ['status'] },
        ],
    }
)

module.exports = Attendance;