'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, ApiError, redis, logger, paginate, pageMeta } = require('@school/shared');
const User = require('../models/user.model');
const academicClient = require('../clients/academic.client');
const notificationClient = require('../clients/notification.client');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;

// Redis key for a stored refresh-token id (enables revocation/logout).
const refreshKey = (userId, jti) => `refresh:${userId}:${jti}`;

function signAccessToken(user) {
    return jwt.sign({
        sub: String(user.id),
        email: user.email,
        role: user.role,
        name: user.fullName
    },
        config.jwt.secret,
        {
            expiresIn: config.jwt.accessExpires
        });
}

async function signRefreshToken(user) {
    const jti = uuidv4();
    const token = jwt.sign({
        sub: String(user.id),
        jti
    },
        config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpires,
    });
    // Track the jti so we can revoke it; TTL roughly matches token lifetime.
    const decoded = jwt.decode(token);
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    await redis.getRedis().set(refreshKey(user.id, jti), '1', 'EX', ttl);
    return token;
}

function publicUser(user) {
    return {
        id: String(user.id),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
    };
}

async function register({ email, password, fullName, role }) {
    email = email.toLowerCase().trim();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
        throw ApiError.conflict('Email is already registered');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
        email,
        passwordHash,
        fullName,
        role: role || 'student'
    });

    // Bind the domain profile: students/teachers get a row in academic_db
    // linked back to this user via userId. Roll the account back if the
    // profile cannot be created so the two DBs never drift apart.
    let profile = null;
    if (user.role === 'student' || user.role === 'teacher') {
        try {
            profile = await academicClient.resolveProfile({
                userId: Number(user.id),
                email,
                fullName,
                role: user.role,
            });
        } catch (err) {
            await user.destroy();
            throw err;
        }
    }

    logger.info('User registered', {
        userId: String(user.id),
        role: user.role
    });

    // Fire-and-forget welcome notification (never blocks the response).
    notificationClient.notify({
        type: 'user-registered',
        userId: Number(user.id),
        to: user.email,
        data: { email: user.email, fullName: user.fullName, role: user.role },
    });

    return { ...publicUser(user), profile };
}

async function login({ email, password }) {
    email = email.toLowerCase().trim();
    const user = await User.findOne({ where: { email } });
    if (!user) throw ApiError.unauthorized('Invalid email');
    if (user.status !== 'active') throw ApiError.forbidden('Account is suspended');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw ApiError.unauthorized('Invalid password');

    user.lastLoginAt = new Date();
    await user.save();

    const [accessToken, refreshToken] = await Promise.all([
        signAccessToken(user),
        signRefreshToken(user),
    ]);
    return { user: publicUser(user), accessToken, refreshToken };
    
}

async function refresh({ refreshToken }) {
    let payload;
    try {
        payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
    } catch (e) {
        throw ApiError.unauthorized('Invalid refresh token');
    }

    const key = refreshKey(payload.sub, payload.jti);
    const exists = await redis.getRedis().get(key);
    if (!exists) throw ApiError.unauthorized('Refresh token revoked or expired');

    const user = await User.findByPk(payload.sub);
    if (!user || user.status !== 'active') throw ApiError.unauthorized('User unavailable');

    // Rotate: invalidate old jti, issue a fresh pair.
    await redis.getRedis().del(key);
    const [accessToken, newRefresh] = await Promise.all([
        signAccessToken(user),
        signRefreshToken(user),
    ]);
    return { accessToken, refreshToken: newRefresh };
}

async function logout({ refreshToken }) {
    try {
        const payload = jwt.verify(refreshToken, config.jwt.refreshSecret);
        await redis.getRedis().del(refreshKey(payload.sub, payload.jti));
    } catch {
        // Already invalid — nothing to revoke.
        console.log('err')
    }
}

async function me(userId) {
    const user = await User.findByPk(userId);
    if (!user) throw ApiError.notFound('User not found');
    return publicUser(user);
}

// Admin-only: list every user, paginated (?page=1&limit=20).
async function userList(query = {}) {
    const { page, limit, offset } = paginate(query);
    const { rows, count } = await User.findAndCountAll({
        order: [['id', 'ASC']],
        limit,
        offset,
    });
    return {
        users: rows.map(publicUser),
        meta: pageMeta(count, { page, limit }),
    };
}

module.exports = { register, login, refresh, logout, me, userList };
