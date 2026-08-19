import type { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/**
 * M-4: Normalize the request path before building the rate-limit key.
 * Without normalization, /api/posts and /api/posts/ count as different buckets,
 * trivially bypassing limits by adding a trailing slash or query params.
 */
function normalizePath(req: Request): string {
  // Use the matched route pattern when available (e.g., "/posts/:id")
  // Fall back to the raw path with trailing slash stripped and query params removed
  const routePath = req.route?.path as string | undefined;
  if (routePath) return routePath;
  return req.path.replace(/\/+$/, '').toLowerCase() || '/';
}

interface MemoryRecord {
  count: number;
  resetAt: number;
}

// In-memory fallback map when Redis is offline
const memoryStore = new Map<string, MemoryRecord>();

// Periodic cleanup of expired memory keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.resetAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

function memoryRateLimit(key: string, windowMs: number, max: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || record.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  record.count += 1;
  const remaining = Math.max(0, max - record.count);
  return { allowed: record.count <= max, remaining };
}

export function rateLimiter(windowMs = 60_000, max = 100, keyPrefix = 'rl') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    const path = normalizePath(req); // M-4: normalized path
    const key = `${keyPrefix}:${ip}:${path}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current)));

      if (current > max) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
        return;
      }
    } catch (err) {
      // If Redis is unreachable, protect the service using in-memory rate limiting fallback
      logger.warn({ err }, '[RATE-LIMIT] Redis unavailable, using in-memory rate limiter fallback');
      const mem = memoryRateLimit(key, windowMs, max);

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(mem.remaining));

      if (!mem.allowed) {
        res.status(429).json({
          success: false,
          error: 'Too many requests. Please try again later.',
        });
        return;
      }
    }

    next();
  };
}

export function authRateLimiter() {
  return rateLimiter(900_000, 10, 'rl:auth');
}
