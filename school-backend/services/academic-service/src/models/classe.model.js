`use strict`
const sequelize = require("../config/database");
const { DataTypes } = require('sequelize');

const Classe = sequelize.define(
    `Class`,
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        name: { type: DataTypes.STRING(80), allowNull: false },
        level: {
            type: DataTypes.ENUM('primary', 'secondary', 'high_school', 'college'),
            allowNull: false,
        },
        gradeYear: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
        academicYear: { type: DataTypes.STRING(9), allowNull: false }, // e.g. "2025-2026"
        homeroomTeacherId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'teacher_id' }, //FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
        capacity: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 40 },
        roomNumber: { type: DataTypes.STRING(20), allowNull: true },
        status: {
            type: DataTypes.ENUM('active', 'archived'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'classes',
        // Cache namespace: class:*
        cacheEntity: 'class',
        // student/course/enrollment reads all embed the class summary.
        cacheDependents: ['student', 'course', 'enrollment'],
        indexes: [
            { fields: ['level'] },
            { fields: ['academic_year'] },
            { fields: ['teacher_id'] },
            { unique: true, fields: ['name', 'academic_year'] },
        ],
    },
)

module.exports = Classe;