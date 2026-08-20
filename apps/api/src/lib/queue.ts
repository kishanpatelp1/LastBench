import { Queue, Worker, type Job, type ConnectionOptions, type WorkerOptions } from 'bullmq';
import { redis } from './redis.js';
import { logger } from './logger.js';

export const connection: ConnectionOptions = {
  ...redis.options,
  maxRetriesPerRequest: null,
} as ConnectionOptions;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 50, // Keep last 50 completed job metrics
  removeOnFail: 100,    // Retain 100 failed jobs
};

// ─── Queues ─────────────────────────────────────────
export const moderationQueue = new Queue('moderation', { connection, defaultJobOptions });
export const notificationQueue = new Queue('notifications', { connection, defaultJobOptions });
export const emailQueue = new Queue('email', { connection, defaultJobOptions });

// ─── Queue Helper with Reduced Polling for Serverless / Cloud Redis ─────────
export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: Partial<WorkerOptions>,
) {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency: 2,
    drainDelay: 30000,       // Wait 30s when queue is empty before polling Redis again (90%+ command reduction)
    stalledInterval: 300000, // Check for stalled jobs every 5 mins instead of every 30s
    lockDuration: 60000,
    ...options,
  });

  // Gracefully handle connection or request-cap errors without crashing
  worker.on('error', (err) => {
    logger.warn({ queue: queueName, message: err.message }, '[BULLMQ] Worker connection warning');
  });

  return worker;
}
