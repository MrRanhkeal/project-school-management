const { server } = require('@school/shared');
const studentRoutes = require('./routes/students.route');
const teacherRoutes = require('./routes/teachers.route');
const courseRoutes = require('./routes/courses.route');
const classeRoutes = require('./routes/classe.route');
const enrollmentRoutes = require('./routes/enrollment.routes');
const internalRoutes = require('./routes/internal.routes');

module.exports = server.createApp({
    serviceName: 'academic-service',
    routes: (app) => {
        // Service-to-service endpoints (not reachable through the gateway).
        app.use('/api/academic/internal', internalRoutes);
        app.use('/api/students', studentRoutes);
        app.use('/api/teachers', teacherRoutes);
        app.use('/api/courses', courseRoutes);
        app.use('/api/classes', classeRoutes);
        app.use('/api/enrollments', enrollmentRoutes);
    },
});
