import type { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis.js';

export function rateLimiter(windowMs = 60_000, max = 100, keyPrefix = 'rl') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip ?? req.headers['x-forwarded-for'] ?? 'unknown';
    const key = `${keyPrefix}:${ip}:${req.path}`;

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
    } catch {
      // If Redis is down, allow the request through
    }

    next();
  };
}

export function authRateLimiter() {
  return rateLimiter(900_000, 10, 'rl:auth');
}
