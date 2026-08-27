const sequelize = require("../config/database");
const { DataTypes } = require('sequelize');

const Students = sequelize.define(
    'Student',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        // Reference to auth-service user (no FK — cross-service boundary).
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, // reference to auth_db.users, by ID only
        studentCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
        firstName: { type: DataTypes.STRING(60), allowNull: false },
        lastName: { type: DataTypes.STRING(60), allowNull: false },
        dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
        gender: { type: DataTypes.ENUM('male', 'female', 'other'), allowNull: true },
        level: {
            type: DataTypes.ENUM('primary', 'secondary', 'high_school', 'college'),
            allowNull: false,
        },
        gradeYear: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true }, // e.g. grade 1..12 / year 1..4
        classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, //FOREIGN KEY (classId) REFERENCES classe(id) ON DELETE SET NULL,
        enrollmentYear: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true },
        guardianName: { type: DataTypes.STRING(120), allowNull: true },
        guardianPhone: { type: DataTypes.STRING(30), allowNull: true },
        email: { type: DataTypes.STRING(160), allowNull: true },
        status: {
            type: DataTypes.ENUM('enrolled', 'graduated', 'withdrawn', 'suspended'),
            allowNull: false,
            defaultValue: 'enrolled',
        },
    },
    {
        tableName: 'students',
        // Cache namespace: student:*  (see shared/redis/autoInvalidate.js)
        cacheEntity: 'student',
        // class:<id> embeds its student roster, and enrollment reads embed the
        // student, so a student write must clear those namespaces too.
        cacheDependents: ['class', 'enrollment'],
        indexes: [
            { unique: true, fields: ['student_code'] },
            { fields: ['level'] },
            { fields: ['class_id'] },
            { fields: ['enrollment_year'] },
            { fields: ['status'] },
            { fields: ['last_name', 'first_name'] },
        ],
    }
)

module.exports = Students;