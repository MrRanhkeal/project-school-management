'use strict'

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define(
    'Payment',
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        payment_id: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            unique: true
        },
        studentId: {
            // Reference to academic_db.students(id). academic_db lives on a
            // DIFFERENT MySQL server, so a real FOREIGN KEY (and a Sequelize
            // Payment.belongsTo(Student) association) is impossible. The
            // relationship is bound at the application level instead — see
            // src/clients/academic.client.js:
            //   - verifyStudent() rejects unknown ids before writes (FK check)
            //   - getStudentsByIds() joins the `student` object on reads
            // onDelete: 'RESTRICT' is mirrored by academic-service, which
            // refuses to delete a student who still has payments.
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
        },
        qr: DataTypes.TEXT,
        md5: DataTypes.STRING(120),
        expire: DataTypes.BIGINT,
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending'
        },
        paid: {
            type: DataTypes.TINYINT(1),
            defaultValue: 0
        },
        paidAt: DataTypes.BIGINT,
        createAt: DataTypes.DATE,
        bakongHash: DataTypes.STRING(120),
        // 🔹 Core accounts
        fromAccounId: DataTypes.STRING(120),
        toAccounId: DataTypes.STRING(120),
        currency: DataTypes.STRING(50),
        amount: DataTypes.DECIMAL(12, 2),
        description: DataTypes.TEXT,
        externalRef: DataTypes.STRING(120),
        createDateMs: DataTypes.BIGINT,
        acknowDateMs: DataTypes.BIGINT,
        // NEW: Store full IndividualInfo (KHQR payload)
        metadata: {
            type: DataTypes.JSON,
            allowNull: true
        }
    },
    {
        tableName: 'payments',
        indexes: [
            { fields: ['status'] },
            { fields: ['payment_id'], unique: true },
            // hasMany lookup path: all payments of one student
            // (underscored: true maps the studentId attribute to this column)
            { fields: ['student_id'] }
        ],

        // Helper methods inside model
        hooks: {
            beforeCreate(payment) {
                // Auto-fill from metadata if exists
                if (payment.metadata) {
                    const info = payment.metadata;

                    payment.toAccounId = payment.toAccounId || info.bakongAccountID;
                    payment.fromAccounId = payment.fromAccounId || info.accountInformation || info.upiMerchantAccount;

                    payment.currency = payment.currency || (info.currency ? String(info.currency) : null);

                    payment.amount = payment.amount || info.amount;

                    payment.externalRef = payment.externalRef || info.billNumber;

                    // Auto description
                    if (!payment.description) {
                        payment.description = [
                            info.merchantName,
                            info.merchantCity,
                            info.storeLabel,
                            info.terminalLabel,
                            info.mobileNumber,
                            info.purposeOfTransaction
                        ]
                            .filter(Boolean)
                            .join(' | ');
                    }
                }
            }
        }
    }
);

module.exports = Payment;