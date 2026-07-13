'use strict'; //easy debugging and error handling

const { server } = require('@school/shared');
const authRoutes = require('./routes/auth.routes');

module.exports = server.createApp({
    serviceName: 'auth-service',
    routes: (app) => {
        app.use('/api/auth', authRoutes);
    },
});
