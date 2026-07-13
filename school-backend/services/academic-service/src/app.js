const { server } = require('@school/shared');
const studentRoutes = require('./routes/students.route');
const teacherRoutes = require('./routes/teachers.route');
const courseRoutes = require('./routes/courses.route');
const classeRoutes = require('./routes/classe.route');

module.exports = server.createApp({
    serviceName: 'academic-service',
    routes: (app) => {
        app.use('/api/students', studentRoutes);
        app.use('/api/teachers', teacherRoutes);
        app.use('/api/courses', courseRoutes);
        app.use('/api/classes', classeRoutes);
    },
});
