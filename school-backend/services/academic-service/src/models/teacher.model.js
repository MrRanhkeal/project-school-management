const sequelize = require("../config/database");
const { DataTypes } = require('sequelize')

const Teachers = sequelize.define(
    'Teachers',
    {
        id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
        userId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true }, 
        teacherCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
        firstName: { type: DataTypes.STRING(60), allowNull: false },
        lastName: { type: DataTypes.STRING(60), allowNull: false },
        email: { type: DataTypes.STRING(160), allowNull: true },
        phone: { type: DataTypes.STRING(30), allowNull: true },
        department: { type: DataTypes.STRING(80), allowNull: true },
        specialization: { type: DataTypes.STRING(120), allowNull: true },
        hireDate: { type: DataTypes.DATEONLY, allowNull: true },
        status: {
            type: DataTypes.ENUM('active', 'on_leave', 'retired'),
            allowNull: false,
            defaultValue: 'active',
        },
    },
    {
        tableName: 'teachers',
        indexes: [
            { unique: true, fields: ['teacher_code'] },
            { fields: ['department'] },
            { fields: ['status'] },
            { fields: ['last_name', 'first_name'] },
        ],
    }
)

module.exports = Teachers;