'use strict';

const { Queue, Worker, QueueEvents } = require('bullmq');
const config = require('../config');
const logger = require('../logger');

//BullMQ connection options. Producers (services) and consumers (workers) share the same Redis instance, decoupling write spikes 

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
};

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 1000, // keep last 1k for inspection
  removeOnFail: 5000,
};

// Producer-side queue handle
function createQueue(name) {
  return new Queue(name, { connection, defaultJobOptions });
}

//Consumer-side worker. `processor` is an async (job) => result function
function createWorker(name, processor, { concurrency = 10 } = {}) {
  const worker = new Worker(name, processor, { connection, concurrency });
  worker.on('completed', (job) => logger.debug(`Job ${job.id} completed`, { queue: name }));
  worker.on('failed', (job, err) =>
    logger.error(`Job ${job?.id} failed`, { queue: name, error: err.message })
  );
  return worker;
}

function createQueueEvents(name) {
  return new QueueEvents(name, { connection });
}

module.exports = { createQueue, createWorker, createQueueEvents, connection };
