`use strict`
const sequelize = require("../config/database");
const { DataTypes } = require('sequelize');

/**
 * Enrollment = the link between a student and a course for a given
 * academic year + term. It is the join table behind
 *   Student.hasMany(Enrollment) / Course.hasMany(Enrollment)
 * and carries its own attributes (status, grade, dates), so it is a real
 * model rather than an implicit belongsToMany table.
 *
 * A student may re-take the same course in a different year/term, so the
 * uniqueness rule is (student_id, course_id, academic_year, term).
 */
const Enrollment = sequelize.define(
    'Enrollment',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        studentId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, //FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
        courseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },  //FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
        classId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },    //FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
        academicYear: { type: DataTypes.STRING(9), allowNull: false }, // e.g. "2025-2026"
        term: {
            type: DataTypes.ENUM('term1', 'term2', 'term3', 'semester1', 'semester2', 'full_year'),
            allowNull: false,
            defaultValue: 'full_year',
        },
        status: {
            type: DataTypes.ENUM('pending', 'active', 'completed', 'dropped'),
            allowNull: false,
            defaultValue: 'active',
        },
        enrolledAt: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
        completedAt: { type: DataTypes.DATEONLY, allowNull: true },
        droppedAt: { type: DataTypes.DATEONLY, allowNull: true },
        finalGrade: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
        remarks: { type: DataTypes.STRING(255), allowNull: true },
    },
    {
        tableName: 'enrollments',
        // Cache namespace: enrollment:*  (nothing else embeds enrollments)
        cacheEntity: 'enrollment',
        indexes: [
            {
                unique: true,
                name: 'uq_enrollment_student_course_year_term',
                fields: ['student_id', 'course_id', 'academic_year', 'term'],
            },
            { fields: ['student_id'] },
            { fields: ['course_id'] },
            { fields: ['class_id'] },
            { fields: ['academic_year'] },
            { fields: ['status'] },
        ],
    },
)

module.exports = Enrollment;
