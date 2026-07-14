'use strict';

const { server } = require('@school/shared');
const routes = require('./routes/payment.route');
const internalRoutes = require('./routes/internal.route');

module.exports = server.createApp({
    serviceName: 'payment-service',
    routes: (app) => {
        // Service-to-service endpoints (x-internal-token protected).
        app.use('/api/payments/internal', internalRoutes);
        app.use('/api/payments', routes);
    },
});
