'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { logger } = require('@school/shared');
const User = require('../models/user.model');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

function publicUser(user) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
    };
}

/**
 * Find-or-create an auth user for a domain profile (teacher/student).
 * Called by academic-service when a teacher or student is created so the
 * profile row can store users.id as its userId.
 *
 * The caller may supply the account password (e.g. admin typed it in the
 * Add-Teacher form). When none is given, a random temporary password is
 * generated and returned ONCE so the admin can hand it to the person.
 */
async function resolveUser({ email, fullName, role, password }) {
    email = email.toLowerCase().trim();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
        return { ...publicUser(existing), created: false };
    }

    const tempPassword = password ? null : crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(password || tempPassword, BCRYPT_ROUNDS);
    const user = await User.create({
        email,
        passwordHash,
        fullName,
        role: role || 'teacher',
    });
    logger.info('Internal user created', { userId: String(user.id), role: user.role });
    return { ...publicUser(user), created: true, ...(tempPassword && { tempPassword }) };
}

/** Batch lookup used for the application-level "join" on reads. */
async function getUsersByIds(ids) {
    const rows = await User.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id', 'email', 'fullName', 'role', 'status'],
    });
    return rows.map(publicUser);
}

module.exports = { resolveUser, getUsersByIds };
