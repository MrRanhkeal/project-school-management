'use strict';

/**
 * Initial schema for academic_db.
 *
 * Mirrors src/models/*.js exactly: `define: { underscored: true, timestamps: true }`
 * in shared/db means every camelCase attribute lands as a snake_case column and
 * every table carries created_at / updated_at. The one attribute that does NOT
 * follow the rule is Class.homeroomTeacherId, which declares
 * `field: 'teacher_id'` — that name is used here.
 *
 * Table order matters: a table is only created after every table it references.
 *   teachers -> classes -> students -> courses -> enrollments
 *
 * @type {import('sequelize-cli').Migration}
 */

const LEVEL = ['primary', 'secondary', 'high_school', 'college'];

const TABLE_OPTS = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

// Every table gets these two, courtesy of `timestamps: true`.
const timestamps = (Sequelize) => ({
    created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
    },
});

const pk = (Sequelize) => ({
    type: Sequelize.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
});

module.exports = {
    async up(queryInterface, Sequelize) {
        // teachers
        await queryInterface.createTable(
            'teachers',
            {
                id: pk(Sequelize),
                // auth_db.users.id — ID-only reference, deliberately no FK.
                user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
                teacher_code: { type: Sequelize.STRING(20), allowNull: false },
                first_name: { type: Sequelize.STRING(60), allowNull: false },
                last_name: { type: Sequelize.STRING(60), allowNull: false },
                email: { type: Sequelize.STRING(160), allowNull: true },
                phone: { type: Sequelize.STRING(30), allowNull: true },
                department: { type: Sequelize.STRING(80), allowNull: true },
                specialization: { type: Sequelize.STRING(120), allowNull: true },
                hire_date: { type: Sequelize.DATEONLY, allowNull: true },
                status: {
                    type: Sequelize.ENUM('active', 'on_leave', 'retired'),
                    allowNull: false,
                    defaultValue: 'active',
                },
                ...timestamps(Sequelize),
            },
            TABLE_OPTS,
        );

        await queryInterface.addIndex('teachers', {
            name: 'uq_teachers_teacher_code',
            unique: true,
            fields: ['teacher_code'],
        });
        await queryInterface.addIndex('teachers', { name: 'ix_teachers_department', fields: ['department'] });
        await queryInterface.addIndex('teachers', { name: 'ix_teachers_status', fields: ['status'] });
        await queryInterface.addIndex('teachers', {
            name: 'ix_teachers_name',
            fields: ['last_name', 'first_name'],
        });

        // classes  (FK -> teachers)
        await queryInterface.createTable(
            'classes',
            {
                id: pk(Sequelize),
                name: { type: Sequelize.STRING(80), allowNull: false },
                level: { type: Sequelize.ENUM(...LEVEL), allowNull: false },
                grade_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
                academic_year: { type: Sequelize.STRING(9), allowNull: false }, // "2025-2026"
                // Class.homeroomTeacherId maps to this column via `field`.
                teacher_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: 'teachers', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE',
                },
                capacity: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: false, defaultValue: 40 },
                room_number: { type: Sequelize.STRING(20), allowNull: true },
                status: {
                    type: Sequelize.ENUM('active', 'archived'),
                    allowNull: false,
                    defaultValue: 'active',
                },
                ...timestamps(Sequelize),
            },
            TABLE_OPTS,
        );

        await queryInterface.addIndex('classes', { name: 'ix_classes_level', fields: ['level'] });
        await queryInterface.addIndex('classes', { name: 'ix_classes_academic_year', fields: ['academic_year'] });
        await queryInterface.addIndex('classes', { name: 'ix_classes_teacher_id', fields: ['teacher_id'] });
        await queryInterface.addIndex('classes', {
            name: 'uq_classes_name_academic_year',
            unique: true,
            fields: ['name', 'academic_year'],
        });

        // students  (FK -> classes)
        await queryInterface.createTable(
            'students',
            {
                id: pk(Sequelize),
                // auth_db.users.id — ID-only reference, deliberately no FK.
                user_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
                student_code: { type: Sequelize.STRING(20), allowNull: false },
                first_name: { type: Sequelize.STRING(60), allowNull: false },
                last_name: { type: Sequelize.STRING(60), allowNull: false },
                date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
                gender: { type: Sequelize.ENUM('male', 'female', 'other'), allowNull: true },
                level: { type: Sequelize.ENUM(...LEVEL), allowNull: false },
                grade_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
                class_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: 'classes', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE',
                },
                enrollment_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
                guardian_name: { type: Sequelize.STRING(120), allowNull: true },
                guardian_phone: { type: Sequelize.STRING(30), allowNull: true },
                email: { type: Sequelize.STRING(160), allowNull: true },
                status: {
                    type: Sequelize.ENUM('enrolled', 'graduated', 'withdrawn', 'suspended'),
                    allowNull: false,
                    defaultValue: 'enrolled',
                },
                ...timestamps(Sequelize),
            },
            TABLE_OPTS,
        );

        await queryInterface.addIndex('students', {
            name: 'uq_students_student_code',
            unique: true,
            fields: ['student_code'],
        });
        await queryInterface.addIndex('students', { name: 'ix_students_level', fields: ['level'] });
        await queryInterface.addIndex('students', { name: 'ix_students_class_id', fields: ['class_id'] });
        await queryInterface.addIndex('students', {
            name: 'ix_students_enrollment_year',
            fields: ['enrollment_year'],
        });
        await queryInterface.addIndex('students', { name: 'ix_students_status', fields: ['status'] });
        await queryInterface.addIndex('students', {
            name: 'ix_students_name',
            fields: ['last_name', 'first_name'],
        });

        // courses  (FK -> teachers, classes)
        await queryInterface.createTable(
            'courses',
            {
                id: pk(Sequelize),
                code: { type: Sequelize.STRING(20), allowNull: true },
                title: { type: Sequelize.STRING(140), allowNull: false },
                description: { type: Sequelize.TEXT, allowNull: true },
                level: { type: Sequelize.ENUM(...LEVEL), allowNull: false },
                credits: { type: Sequelize.DECIMAL(4, 1), allowNull: false, defaultValue: 1.0 },
                department: { type: Sequelize.STRING(80), allowNull: true },
                teacher_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: 'teachers', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE',
                },
                class_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: 'classes', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                },
                academic_year: { type: Sequelize.STRING(9), allowNull: true },
                price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                status: {
                    type: Sequelize.ENUM('open', 'closed', 'archived'),
                    allowNull: false,
                    defaultValue: 'open',
                },
                ...timestamps(Sequelize),
            },
            TABLE_OPTS,
        );

        // `code` is nullable; MySQL lets a unique index hold many NULLs, which is
        // what the model wants (a course may exist before it is given a code).
        await queryInterface.addIndex('courses', {
            name: 'uq_courses_code',
            unique: true,
            fields: ['code'],
        });
        await queryInterface.addIndex('courses', { name: 'ix_courses_level', fields: ['level'] });
        await queryInterface.addIndex('courses', { name: 'ix_courses_teacher_id', fields: ['teacher_id'] });
        await queryInterface.addIndex('courses', { name: 'ix_courses_class_id', fields: ['class_id'] });
        await queryInterface.addIndex('courses', { name: 'ix_courses_status', fields: ['status'] });

        // enrollments  (FK -> students, courses, classes)
        await queryInterface.createTable(
            'enrollments',
            {
                id: pk(Sequelize),
                student_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: 'students', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                },
                course_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: false,
                    references: { model: 'courses', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE',
                },
                class_id: {
                    type: Sequelize.BIGINT.UNSIGNED,
                    allowNull: true,
                    references: { model: 'classes', key: 'id' },
                    onDelete: 'SET NULL',
                    onUpdate: 'CASCADE',
                },
                academic_year: { type: Sequelize.STRING(9), allowNull: false },
                term: {
                    type: Sequelize.ENUM('term1', 'term2', 'term3', 'semester1', 'semester2', 'full_year'),
                    allowNull: false,
                    defaultValue: 'full_year',
                },
                status: {
                    type: Sequelize.ENUM('pending', 'active', 'completed', 'dropped'),
                    allowNull: false,
                    defaultValue: 'active',
                },
                // The model supplies the default (DataTypes.NOW) on create, so no
                // DB-level DATE default is declared — MySQL only accepts expression
                // defaults on DATE from 8.0.13, and the app never relies on it.
                enrolled_at: { type: Sequelize.DATEONLY, allowNull: false },
                completed_at: { type: Sequelize.DATEONLY, allowNull: true },
                dropped_at: { type: Sequelize.DATEONLY, allowNull: true },
                final_grade: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
                remarks: { type: Sequelize.STRING(255), allowNull: true },
                ...timestamps(Sequelize),
            },
            TABLE_OPTS,
        );

        // Re-taking a course in another year/term is legal, so the uniqueness
        // rule spans four columns rather than (student_id, course_id).
        await queryInterface.addIndex('enrollments', {
            name: 'uq_enrollment_student_course_year_term',
            unique: true,
            fields: ['student_id', 'course_id', 'academic_year', 'term'],
        });
        await queryInterface.addIndex('enrollments', { name: 'ix_enrollments_student_id', fields: ['student_id'] });
        await queryInterface.addIndex('enrollments', { name: 'ix_enrollments_course_id', fields: ['course_id'] });
        await queryInterface.addIndex('enrollments', { name: 'ix_enrollments_class_id', fields: ['class_id'] });
        await queryInterface.addIndex('enrollments', {
            name: 'ix_enrollments_academic_year',
            fields: ['academic_year'],
        });
        await queryInterface.addIndex('enrollments', { name: 'ix_enrollments_status', fields: ['status'] });
    },

    async down(queryInterface) {
        // Reverse creation order so no FK is left dangling.
        await queryInterface.dropTable('enrollments');
        await queryInterface.dropTable('courses');
        await queryInterface.dropTable('students');
        await queryInterface.dropTable('classes');
        await queryInterface.dropTable('teachers');
    },
};
