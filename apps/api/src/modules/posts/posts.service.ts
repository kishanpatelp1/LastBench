import { prisma } from '../../lib/prisma.js';
import { invalidateCache, getCache, setCache } from '../../lib/redis.js';
import { AppError } from '../../middleware/error-handler.js';
import { moderationQueue } from '../../lib/queue.js';
import type { CreatePostInput, FeedQuery, VoteInput } from '@lastbench/shared';
import { Prisma } from '@prisma/client';
import { sanitizeInput } from '../../lib/sanitize.js';
import { formatPost } from './post.formatter.js';

export const postService = {
  async create(authorId: string, input: CreatePostInput) {
    // Verify community exists and user is a member
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId: authorId, communityId: input.communityId } },
    });

    if (!membership) {
      throw new AppError(403, 'You must join the community before posting');
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        communityId: input.communityId,
        title: input.title ? sanitizeInput(input.title) : undefined,
        content: sanitizeInput(input.content),
        type: input.type ?? 'TEXT',
        linkUrl: input.linkUrl ?? null,
        isAnonymous: input.isAnonymous ?? true,
        mediaUrls: input.mediaUrls ?? [],
        tags: input.tags ?? [],
        poll: input.poll
          ? {
              create: {
                expiresAt: input.poll.expiresAt ? new Date(input.poll.expiresAt) : null,
                options: {
                  create: input.poll.options.map((text, idx) => ({
                    text: sanitizeInput(text),
                    orderNum: idx,
                  })),
                },
              },
            }
          : undefined,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        community: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
      },
    });

    // Queue moderation check
    await moderationQueue.add('check-post', { postId: post.id, content: post.content });

    // Invalidate feed caches
    await invalidateCache('feed:*');

    return formatPost(post, authorId);
  },

  async getFeed(query: FeedQuery, userId?: string) {
    const { cursor, limit, sort, timeRange, communityId, authorId, authorUsername } = query;
    // The home feed is a record of the campus, not an expiring stream. Time
    // filtering is opt-in so older real posts remain discoverable by default.
    const effectiveTimeRange = timeRange || 'all';

    // M-8: Cache-aside — only cache anonymous, first-page, default-sort feeds without specific author
    const cacheKey = !userId && !cursor && !authorId && !authorUsername
      ? `feed:${sort}:${effectiveTimeRange}:${communityId ?? 'all'}:${limit}`
      : null;

    if (cacheKey) {
      const cached = await getCache<{ items: any[]; nextCursor?: string; hasMore: boolean }>(cacheKey);
      if (cached) return cached;
    }

    // Build where clause
    const where: Record<string, unknown> = { isDeleted: false };
    if (communityId) where.communityId = communityId;
    if (authorId) where.authorId = authorId;
    if (authorUsername) {
      where.author = { username: { equals: authorUsername, mode: 'insensitive' } };
      where.isAnonymous = false;
    }

    if (effectiveTimeRange !== 'all') {
      const now = new Date();
      const ranges: Record<string, number> = {
        day: 1,
        week: 7,
        month: 30,
        year: 365,
      };
      const days = ranges[effectiveTimeRange] ?? 7;
      where.createdAt = { gte: new Date(now.getTime() - days * 24 * 60 * 60 * 1000) };
    }

    // Build orderBy
    const orderBy: Record<string, string>[] =
      sort === 'hot'
        ? [{ score: 'desc' }, { createdAt: 'desc' }]
        : sort === 'top'
          ? [{ score: 'desc' }]
          : [{ createdAt: 'desc' }];

    const posts = await prisma.post.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        community: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        poll: { include: { options: { include: { _count: { select: { votes: true } } } } } },
        votes: userId ? { where: { userId }, select: { type: true } } : false,
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const formatted = items.map((post: (typeof items)[number]) => formatPost(post, userId));

    const result = {
      items: formatted,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      hasMore,
    };

    // M-8: Populate cache for anonymous first-page results (TTL 60s)
    if (cacheKey) {
      await setCache(cacheKey, result, 60);
    }

    return result;
  },

  async getById(postId: string, userId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId, isDeleted: false },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        community: { select: { id: true, name: true, slug: true, avatarUrl: true } },
        poll: {
          include: {
            options: {
              orderBy: { orderNum: 'asc' },
              include: {
                _count: { select: { votes: true } },
                votes: userId ? { where: { userId }, select: { id: true } } : false,
              },
            },
          },
        },
        votes: userId ? { where: { userId }, select: { type: true } } : false,
      },
    });

    if (!post) throw new AppError(404, 'Post not found');
    return formatPost(post, userId);
  },

  async vote(postId: string, userId: string, input: VoteInput) {
    // C-3: Wrap all vote mutations in a transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const post = await tx.post.findUnique({ where: { id: postId } });
      if (!post) throw new AppError(404, 'Post not found');

      const existing = await tx.vote.findUnique({
        where: { userId_postId: { userId, postId } },
      });

      let scoreDelta = 0;

      if (existing) {
        if (existing.type === input.type) {
          // Remove vote (toggle off)
          await tx.vote.delete({ where: { id: existing.id } });
          scoreDelta = input.type === 'UP' ? -1 : 1;
        } else {
          // Change vote direction
          await tx.vote.update({
            where: { id: existing.id },
            data: { type: input.type },
          });
          scoreDelta = input.type === 'UP' ? 2 : -2;
        }
      } else {
        // New vote
        await tx.vote.create({
          data: { userId, postId, type: input.type },
        });
        scoreDelta = input.type === 'UP' ? 1 : -1;
      }

      const updated = await tx.post.update({
        where: { id: postId },
        data: { score: { increment: scoreDelta } },
        select: { score: true },
      });

      return { postId, score: updated.score };
    });

    return result;
  },

  async votePoll(postId: string, userId: string, optionId: string) {
    const poll = await prisma.poll.findUnique({
      where: { postId },
      include: { options: { select: { id: true } } },
    });

    if (!poll) throw new AppError(404, 'Poll not found');
    if (poll.expiresAt && poll.expiresAt < new Date()) {
      throw new AppError(400, 'Poll has expired');
    }

    const validOption = poll.options.find((o: (typeof poll.options)[number]) => o.id === optionId);
    if (!validOption) throw new AppError(400, 'Invalid poll option');

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.pollVote.findFirst({
        where: {
          userId,
          pollId: poll.id,
        },
      });

      if (existing) {
        if (existing.optionId === optionId) {
          // Toggle off / unselect vote
          await tx.pollVote.delete({
            where: { id: existing.id },
          });
        } else {
          // Switch vote to the new option
          await tx.pollVote.update({
            where: { id: existing.id },
            data: { optionId },
          });
        }
      } else {
        // Create new poll vote
        await tx.pollVote.create({
          data: { userId, optionId, pollId: poll.id },
        });
      }
    });

    return { success: true };
  },

  async delete(postId: string, userId: string, role: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new AppError(404, 'Post not found');

    if (post.authorId !== userId && role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new AppError(403, 'Not authorized');
    }

    await prisma.post.update({
      where: { id: postId },
      data: { isDeleted: true },
    });

    await invalidateCache('feed:*');
    return { success: true };
  },
};
