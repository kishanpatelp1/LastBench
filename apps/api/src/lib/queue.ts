import { Queue, Worker, type Job } from 'bullmq';
import { redis } from './redis.js';

const connection = {
  ...redis.options,
  maxRetriesPerRequest: null,
};

// ─── Queues ─────────────────────────────────────────
export const moderationQueue = new Queue('moderation', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const emailQueue = new Queue('email', { connection });

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
