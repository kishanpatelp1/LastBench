import { Router } from 'express';
import { searchQuerySchema } from '@lastbench/shared';
import { validate } from '../../middleware/validate.js';
import { prisma } from '../../lib/prisma.js';
import { getCache, setCache } from '../../lib/redis.js';

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
                  votes: req.userId ? { where: { userId: req.userId } } : false,
                },
                orderBy: { orderNum: 'asc' },
              },
            },
          },
          votes: req.userId ? { where: { userId: req.userId } } : false,
        },
      });

      results.posts = rawPosts.map((p) => {
        return {
          id: p.id,
          title: p.title,
          content: p.content,
          type: p.type,
          isAnonymous: p.isAnonymous,
          mediaUrls: p.mediaUrls,
          tags: p.tags,
          score: p.score,
          commentCount: p.commentCount,
          isPinned: p.isPinned,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          author: p.isAnonymous
            ? { id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null }
            : p.author,
          community: p.community,
          userVote: Array.isArray(p.votes) && p.votes.length > 0 ? p.votes[0]?.type ?? null : null,
          poll: p.poll ? (() => {
            const pollOptions = p.poll.options;
            const total = pollOptions.reduce((sum, opt) => sum + (opt._count?.votes || 0), 0);
            return {
              id: p.poll.id,
              expiresAt: p.poll.expiresAt,
              totalVotes: total,
              userVotedOptionId: pollOptions.find(o => Array.isArray(o.votes) && o.votes.length > 0)?.id || null,
              options: pollOptions.map(o => {
                const count = o._count?.votes || 0;
                return {
                  id: o.id,
                  text: o.text,
                  voteCount: count,
                  percentage: total > 0 ? Math.round((count / total) * 100) : 0,
                };
              }),
            };
          })() : null,
        };
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

    if (cacheKey) await setCache(cacheKey, results, 120);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});
