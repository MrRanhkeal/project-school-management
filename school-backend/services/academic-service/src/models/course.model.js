
`use strict`
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define(
    'Course',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // Uniqueness is declared once, in `indexes` below - an attribute-level
        // `unique: true` here would make sync() build a second redundant index.
        code: { type: DataTypes.STRING(20), allowNull: true },
        title: { type: DataTypes.STRING(140), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        level: {
            type: DataTypes.ENUM('primary', 'secondary', 'high_school', 'college'),
            allowNull: false,
        },
        credits: { type: DataTypes.DECIMAL(4, 1), allowNull: false, defaultValue: 1.0 },
        department: { type: DataTypes.STRING(80), allowNull: true },
        teacherId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, //FOREIGN KEY (teacherId) REFERENCES teachers(id) ON DELETE SET NULL
        classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, //FOREIGN KEY (classID) REFERENCES classe(id) ON DELETE CASCADE,
        academicYear: { type: DataTypes.STRING(9), allowNull: true },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },  
        status: {
            type: DataTypes.ENUM('open', 'closed', 'archived'),
            allowNull: false,
            defaultValue: 'open',
        },
    },
    {
        tableName: 'courses',
        // Cache namespace: course:*
        cacheEntity: 'course',
        // class:<id> lists its courses; enrollment reads embed the course.
        cacheDependents: ['class', 'enrollment'],
        indexes: [
            { unique: true, fields: ['code'] },
            { fields: ['level'] },
            { fields: ['teacher_id'] },
            { fields: ['class_id'] },
            { fields: ['status'] },
        ],
    }
)
module.exports = Course;
