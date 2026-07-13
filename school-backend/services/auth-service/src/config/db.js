'use strict';

const { db } = require('@school/shared');

// One pooled Sequelize instance per service process.
//Sequelize  a promise-based Node.js Object-Relational Mapping (ORM) library.
const sequelize = db.createSequelize();

module.exports = sequelize;
