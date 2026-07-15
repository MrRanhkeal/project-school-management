'use strict';

// const { server } = require('@school/shared');
const {server}= require('@school/shared')
const routes = require('./routes/notification.route');
const internalRoutes = require('./routes/internal.route');

module.exports = server.createApp({
    serviceName: 'notification-service',
    routes: (app) => {
        // Service-to-service fan-in (auth/academic/record/payment-service).
        app.use('/api/notifications/internal', internalRoutes);
        app.use('/api/notifications', routes);
    },
});
