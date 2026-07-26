import { Router } from 'express';
import { searchQuerySchema } from '@lastbench/shared';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { getCache, setCache } from '../../lib/redis.js';

export const searchRoutes: Router = Router();

searchRoutes.get('/', validate(searchQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { q, type, limit } = req.validated as { q: string; type: string; limit: number };
    
    // Cache-aside pattern for frequent campus search queries (2 min TTL)
    const cacheKey = `search:${type}:${q.toLowerCase().trim()}:${limit}`;
    const cached = await getCache<Record<string, unknown>>(cacheKey);
    if (cached) {
      res.json({ success: true, data: cached });
      return;
    }

    const results: { posts?: unknown[]; communities?: unknown[] } = {};

    if (type === 'posts' || type === 'all') {
      results.posts = await prisma.post.findMany({
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
        include: { community: { select: { id: true, name: true, slug: true } } },
      });
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

    await setCache(cacheKey, results, 120);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});
