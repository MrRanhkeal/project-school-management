'use strict';

const { queue } = require('@school/shared');

// Single producer handle for the 'notification' queue, shared by the public
// /send route and the internal /dispatch route so only one BullMQ Queue
// instance (and Redis connection) exists per process.
module.exports = queue.createQueue('notification');
