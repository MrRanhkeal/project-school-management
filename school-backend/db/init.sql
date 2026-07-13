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

-- ---------- records-service ----------
CREATE DATABASE IF NOT EXISTS records_db;
USE records_db;

    CREATE TABLE grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,           -- reference to academic_db.students, by ID only
        course_id INT NOT NULL,            -- reference to academic_db.courses, by ID only
        score DECIMAL(5,2),
        grade VARCHAR(5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_grades_student (student_id),
        INDEX idx_grades_course (course_id),
        UNIQUE KEY uq_grade (student_id, course_id)
    );

    CREATE TABLE attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,           -- by ID only
        classroom_id INT NOT NULL,         -- by ID only
        date DATE NOT NULL,
        status ENUM('present', 'absent', 'late') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_att_student (student_id),
        UNIQUE KEY uq_attendance (student_id, classroom_id, date)
    );

