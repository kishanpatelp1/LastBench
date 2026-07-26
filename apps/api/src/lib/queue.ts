import { Queue, Worker, type Job, type ConnectionOptions } from 'bullmq';
import { redis } from './redis.js';

export const connection: ConnectionOptions = {
  ...redis.options,
  maxRetriesPerRequest: null,
} as ConnectionOptions;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100, // Keep last 100 completed job metrics; prevent infinite Redis memory leak
  removeOnFail: 500,     // Retain 500 failed jobs for monitoring/debugging
};

// ─── Queues ─────────────────────────────────────────
export const moderationQueue = new Queue('moderation', { connection, defaultJobOptions });
export const notificationQueue = new Queue('notifications', { connection, defaultJobOptions });
export const emailQueue = new Queue('email', { connection, defaultJobOptions });

// ─── Queue Helper ───────────────────────────────────
export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
) {
  return new Worker<T>(queueName, processor, {
    connection,
    concurrency: 5,
  });
}
