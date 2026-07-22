import { prisma } from '../../lib/prisma.js';
import { invalidateCache, getCache, setCache } from '../../lib/redis.js';
import { AppError } from '../../middleware/error-handler.js';
import { moderationQueue } from '../../lib/queue.js';
import type { CreatePostInput, FeedQuery, VoteInput } from '@lastbench/shared';
import type { Prisma } from '@prisma/client';

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
        title: input.title,
        content: input.content,
        type: input.type ?? 'TEXT',
        isAnonymous: input.isAnonymous ?? true,
        mediaUrls: input.mediaUrls ?? [],
        tags: input.tags ?? [],
        poll: input.poll
          ? {
              create: {
                expiresAt: input.poll.expiresAt ? new Date(input.poll.expiresAt) : null,
                options: {
                  create: input.poll.options.map((text, idx) => ({
                    text,
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

    return this.formatPost(post, authorId);
  },

  async getFeed(query: FeedQuery, userId?: string) {
    const { cursor, limit, sort, timeRange, communityId, college } = query;

    // M-8: Cache-aside — only cache anonymous, first-page, default-sort feeds
    const cacheKey = !userId && !cursor
      ? `feed:${sort}:${timeRange}:${communityId ?? 'all'}:${college ?? 'all'}:${limit}`
      : null;

    if (cacheKey) {
      const cached = await getCache<ReturnType<typeof this.formatPost>[]>(cacheKey);
      if (cached) return { items: cached, nextCursor: undefined, hasMore: false };
    }

    // Build where clause
    const where: Record<string, unknown> = { isDeleted: false };
    if (communityId) where.communityId = communityId;
    if (college) where.community = { college };

    if (timeRange !== 'all') {
      const now = new Date();
      const ranges: Record<string, number> = {
        day: 1,
        week: 7,
        month: 30,
        year: 365,
      };
      const days = ranges[timeRange] ?? 7;
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
    const formatted = items.map((post: (typeof items)[number]) => this.formatPost(post, userId));

    // M-8: Populate cache for anonymous first-page results (TTL 60s)
    if (cacheKey && !hasMore) {
      await setCache(cacheKey, formatted, 60);
    }

    return {
      items: formatted,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      hasMore,
    };
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
    return this.formatPost(post, userId);
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

    // Check if already voted on any option in this poll
    const existing = await prisma.pollVote.findFirst({
      where: {
        userId,
        option: { pollId: poll.id },
      },
    });

    if (existing) throw new AppError(400, 'You have already voted on this poll');

    await prisma.pollVote.create({
      data: { userId, optionId, pollId: poll.id },
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

  // Helper to format post response
  formatPost(post: Record<string, unknown>, userId?: string) {
    const votes = (post as Record<string, unknown[]>).votes;
    const userVote = Array.isArray(votes) && votes.length > 0
      ? (votes[0] as Record<string, string>).type
      : null;

    const author = post.author as Record<string, unknown>;
    const formattedAuthor = (post as Record<string, boolean>).isAnonymous
      ? { id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null }
      : author;

    const poll = post.poll as Record<string, unknown> | null;
    let formattedPoll = null;
    if (poll) {
      const options = poll.options as Array<Record<string, unknown>>;
      const totalVotes = options.reduce((sum, o) => {
        const count = (o._count as Record<string, number>)?.votes ?? 0;
        return sum + count;
      }, 0);

      formattedPoll = {
        id: poll.id,
        expiresAt: poll.expiresAt,
        totalVotes,
        userVotedOptionId: null as string | null,
        options: options.map((o) => {
          const voteCount = (o._count as Record<string, number>)?.votes ?? 0;
          const hasUserVoted = Array.isArray(o.votes) && o.votes.length > 0;
          if (hasUserVoted) formattedPoll!.userVotedOptionId = o.id as string;
          return {
            id: o.id,
            text: o.text,
            voteCount,
            percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
          };
        }),
      };
    }

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      type: post.type,
      isAnonymous: post.isAnonymous,
      mediaUrls: post.mediaUrls,
      tags: post.tags,
      score: post.score,
      commentCount: post.commentCount,
      isPinned: post.isPinned,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: formattedAuthor,
      community: post.community,
      userVote,
      poll: formattedPoll,
    };
  },
};
