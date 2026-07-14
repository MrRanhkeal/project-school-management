-- ============================================================
-- One database per service. Cross-service references are plain
-- indexed INT columns (no FOREIGN KEY across service boundaries).
-- ============================================================

-- ---------- auth-service ----------
CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'student', 'teacher') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Seed admin: admin@school.local / admin123 (bcrypt, cost 10)
    INSERT INTO users (email, password, role) VALUES
    ('admin@school.com', '$2b$10$104zR0NQmXD6pvVjyEXgzegqfZG1zXziLQebww7MHpPWlbupSED6K', 'admin');

-- ---------- academic-service ----------
-- Tables (teachers, classes, students, courses) are owned by the service's
-- Sequelize models (services/academic-service/src/models) and created via
-- sequelize.sync() on boot, including FK constraints between them.
CREATE DATABASE IF NOT EXISTS academic_db;

-- ---------- record-service ----------
-- Tables (grades, attendance) are owned by the service's Sequelize models
-- (services/record-service/src/models) and created via sequelize.sync().
CREATE DATABASE IF NOT EXISTS record_db;

-- NOTE: teachers.user_id / students.user_id reference auth_db.users.id, but
-- auth_db lives on a DIFFERENT MySQL server (auth-db container), so a real
-- FOREIGN KEY is impossible. The link is enforced at the application level:
-- academic-service calls auth-service's internal API
-- (POST /api/auth/internal/users/resolve) to find-or-create the user and
-- stores the returned id, and joins user info on reads via
-- GET /api/auth/internal/users?ids=...

-- NOTE: record_db.grades / record_db.attendance would have these FKs if the
-- tables lived on the same server as academic_db:
--   grades:     FOREIGN KEY (student_id) REFERENCES academic_db.students(id)
--               FOREIGN KEY (course_id)  REFERENCES academic_db.courses(id)
--               FOREIGN KEY (class_id)   REFERENCES academic_db.classes(id)
--   attendance: FOREIGN KEY (student_id) REFERENCES academic_db.students(id)
--               FOREIGN KEY (course_id)  REFERENCES academic_db.courses(id)
--               FOREIGN KEY (class_id)   REFERENCES academic_db.classes(id)
-- Since record-db is a separate MySQL server, the relationship is bound at
-- the application level instead: record-service calls academic-service's
-- internal API (POST /api/academic/internal/refs/verify) before every write
-- to reject unknown ids like a FK violation would, and joins names on reads
-- via GET /api/academic/internal/students|courses|classes?ids=...



-- ---------- payment-service ----------
-- The payments table is owned by the service's Sequelize model
-- (services/payment-service/src/models/payment.model.js) and created via
-- sequelize.sync() on boot, including the studentId index.
CREATE DATABASE IF NOT EXISTS payment_db;

-- NOTE: payment_db.payments.studentId references academic_db.students(id),
-- i.e. the association that would exist on a single server:
--   Students.hasMany(Payment,  { foreignKey: 'studentId', as: 'payments' });
--   Payment.belongsTo(Students, { foreignKey: 'studentId', as: 'student' });
-- Since payment-db is a separate MySQL server, a real FOREIGN KEY (and a
-- cross-service Sequelize association) is impossible. The relationship is
-- bound at the application level instead:
--   - payment-service calls academic-service's internal API
--     (POST /api/academic/internal/refs/verify) before every payment write
--     to reject unknown studentIds like a FK violation would, and joins the
--     `student` object on reads via GET /api/academic/internal/students?ids=...
--   - academic-service joins each student's `payments` array via
--     GET /api/payments/internal/by-student?ids=... and refuses to delete a
--     student who still has payments (onDelete: RESTRICT equivalent).

