import Redis from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (err) => {
  logger.error({ err: err.message }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
}

export async function setCache(key: string, data: unknown, ttlSeconds = 300): Promise<void> {
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
}

/**
 * C-4: Replace blocking redis.keys() with non-blocking SCAN cursor iteration.
 * KEYS is O(N) and blocks the Redis event loop. SCAN iterates in batches
 * without blocking, making it safe for production under load.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const keysToDelete: string[] = [];
  const stream = redis.scanStream({ match: pattern, count: 100 });

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (keys: string[]) => {
      keysToDelete.push(...keys);
    });
    stream.on('end', resolve);
    stream.on('error', reject);
  });

  if (keysToDelete.length > 0) {
    // Delete in chunks of 100 to avoid oversize DEL commands
    const chunkSize = 100;
    for (let i = 0; i < keysToDelete.length; i += chunkSize) {
      const chunk = keysToDelete.slice(i, i + chunkSize);
      await redis.del(...chunk);
    }
  }
}
