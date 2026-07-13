'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Auth identity. Domain profiles (student/teacher details) live in their own
 * services and reference this user by id, keeping auth concerns isolated.
 */
const User = sequelize.define(
    'User',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        email: {
            type: DataTypes.STRING(160),
            allowNull: false,
            unique: true,
            validate: { isEmail: true },
        },
        passwordHash: { type: DataTypes.STRING(100), allowNull: false },
        fullName: { type: DataTypes.STRING(120), allowNull: false },
        role: {
            type: DataTypes.ENUM('admin', 'staff', 'teacher', 'student'),
            allowNull: false,
            defaultValue: 'student',
        },
        status: {
            type: DataTypes.ENUM('active', 'suspended'),
            allowNull: false,
            defaultValue: 'active',
        },
        lastLoginAt: { type: DataTypes.DATE, allowNull: true },
    },
    {
        tableName: 'users',
        indexes: [
            { unique: true, fields: ['email'] },
            { fields: ['role'] },
            { fields: ['status'] },
        ],
    }
);

module.exports = User;
