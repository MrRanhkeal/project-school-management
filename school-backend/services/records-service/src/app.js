const { server } = require('@school/shared');
const attendanceRoutes = require('./routes/attendance');
const gradeRoutes = require('./routes/grades');

module.exports = server.createApp({
    serviceName: 'records-service',
    routes: (app) => {
        app.use('/api/attendance', attendanceRoutes);
        app.use('/api/grades', gradeRoutes);
    },
});
