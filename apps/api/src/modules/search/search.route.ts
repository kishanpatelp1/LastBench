import { Router } from 'express';
import { searchQuerySchema } from '@lastbench/shared';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { getCache, setCache } from '../../lib/redis.js';
import { formatPost } from '../posts/post.formatter.js';

import { optionalAuth } from '../../middleware/auth.middleware.js';

export const searchRoutes: Router = Router();

searchRoutes.get('/', optionalAuth(), validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, type, limit } = req.validated as { q: string; type: string; limit: number };
    
    // Cache-aside pattern for frequent campus search queries (only cache for unauthenticated requests)
    const cacheKey = !req.userId ? `search:${type}:${q.toLowerCase().trim()}:${limit}` : null;
    if (cacheKey) {
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }
    }

    const results: { posts?: unknown[]; communities?: unknown[] } = {};

    if (type === 'posts' || type === 'all') {
      const rawPosts = await prisma.post.findMany({
        where: {
          isDeleted: false,
          OR: [
            { content: { contains: q, mode: 'insensitive' } },
            { title: { contains: q, mode: 'insensitive' } },
            { tags: { hasSome: [q.toLowerCase()] } },
          ],
        },
        take: limit,
        orderBy: { score: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          community: { select: { id: true, name: true, slug: true, avatarUrl: true } },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } },
                  votes: req.userId ? { where: { userId: req.userId } } : undefined,
                },
                orderBy: { orderNum: 'asc' },
              },
            },
          },
          votes: req.userId ? { where: { userId: req.userId } } : undefined,
        },
      });

      results.posts = rawPosts.map((p) => formatPost(p as Parameters<typeof formatPost>[0], req.userId));
    }

    if (type === 'communities' || type === 'all') {
      results.communities = await prisma.community.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: { _count: { select: { members: true } } },
      });
    }

    if (cacheKey) await setCache(cacheKey, results, 120);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});
