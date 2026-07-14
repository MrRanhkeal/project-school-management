`use strict`
const sequilize = require("../config/database");
const { DataTypes } = require('sequelize');

const Grade = sequilize.define(
    `Grade`,
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, //reference to academic_db.students, by ID only
        courseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, //reference to academic_db.courses, by ID only
        classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
        term: { type: DataTypes.STRING(20), allowNull: false }, // e.g. "2025-T1", "Semester 1"
        assessment: { type: DataTypes.STRING(80), allowNull: true }, // "Midterm", "Final", "Quiz 1"
        score: { type: DataTypes.DECIMAL(6, 2), allowNull: false },
        maxScore: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 100 },
        weight: { type: DataTypes.DECIMAL(4, 2), allowNull: false, defaultValue: 1.0 },
        letterGrade: { type: DataTypes.STRING(3), allowNull: true },
        gradedBy: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
        remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
        tableName: 'grades',
        indexes: [
            { fields: ['student_id'] },
            { fields: ['course_id'] },
            { fields: ['student_id', 'term'] },
            { fields: ['student_id', 'course_id', 'term'] },
        ],
    }
)

module.exports = Grade;