'use strict'; //easy debugging and error handling

const { server } = require('@school/shared');
const authRoutes = require('./routes/auth.routes');
const internalRoutes = require('./routes/internal.routes');

module.exports = server.createApp({
    serviceName: 'auth-service',
    routes: (app) => {
        // Service-to-service endpoints (not reachable through the gateway).
        app.use('/api/auth/internal', internalRoutes);
        app.use('/api/auth', authRoutes);
    },
});
