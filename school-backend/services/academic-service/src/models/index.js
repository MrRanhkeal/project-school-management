'use strict';

const sequelize = require('../config/database');
const Teacher = require('./teacher.model');
const SchoolClass = require('./classe.model');
const Student = require('./student.model');
const Course = require('./course.model');
const Enrollment = require('./enrollment.model');

// ---------------------------------------------------------------------------
// Associations (all FKs stay inside academic_db; userId refs to auth_db are
// deliberately NOT associated — cross-service boundary, ID-only).
// ---------------------------------------------------------------------------

// A teacher can be the homeroom teacher of many classes (classes.teacher_id).
Teacher.hasMany(SchoolClass, {
    as: 'homeroomClasses',
    foreignKey: 'homeroomTeacherId',
    onDelete: 'SET NULL',
});
SchoolClass.belongsTo(Teacher, {
    as: 'homeroomTeacher',
    foreignKey: 'homeroomTeacherId',
});

// A class holds many students (students.class_id).
SchoolClass.hasMany(Student, {
    as: 'students',
    foreignKey: 'classId',
    onDelete: 'SET NULL',
});
Student.belongsTo(SchoolClass, {
    as: 'class',
    foreignKey: 'classId',
});

// A teacher teaches many courses (courses.teacher_id).
Teacher.hasMany(Course, {
    as: 'courses',
    foreignKey: 'teacherId',
    onDelete: 'SET NULL',
});
Course.belongsTo(Teacher, {
    as: 'teacher',
    foreignKey: 'teacherId',
});

// A class has many courses on its schedule (courses.class_id).
SchoolClass.hasMany(Course, {
    as: 'courses',
    foreignKey: 'classId',
    onDelete: 'CASCADE',
});
Course.belongsTo(SchoolClass, {
    as: 'class',
    foreignKey: 'classId',
});

// ---------------------------------------------------------------------------
// Enrollment: student <-> course join model (enrollments.student_id /
// .course_id / .class_id). Declared as hasMany/belongsTo rather than
// belongsToMany so the extra columns (status, finalGrade, dates) stay
// first-class and Sequelize does not add its own unique key on
// (student_id, course_id) — re-taking a course in another year is legal.
// ---------------------------------------------------------------------------

// A student has many enrollments (enrollments.student_id).
Student.hasMany(Enrollment, {
    as: 'enrollments',
    foreignKey: 'studentId',
    onDelete: 'CASCADE',
});
Enrollment.belongsTo(Student, {
    as: 'student',
    foreignKey: 'studentId',
});

// A course has many enrollments (enrollments.course_id).
Course.hasMany(Enrollment, {
    as: 'enrollments',
    foreignKey: 'courseId',
    onDelete: 'CASCADE',
});
Enrollment.belongsTo(Course, {
    as: 'course',
    foreignKey: 'courseId',
});

// The class the enrollment was taken under (enrollments.class_id).
SchoolClass.hasMany(Enrollment, {
    as: 'enrollments',
    foreignKey: 'classId',
    onDelete: 'SET NULL',
});
Enrollment.belongsTo(SchoolClass, {
    as: 'class',
    foreignKey: 'classId',
});

module.exports = { sequelize, Teacher, SchoolClass, Student, Course, Enrollment };
