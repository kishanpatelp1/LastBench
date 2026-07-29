import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { CreateCommunityInput, CommunitiesQuery } from '@lastbench/shared';
import { getCache, setCache, invalidateCache } from '../../lib/redis.js';

export const communityService = {
  async create(input: CreateCommunityInput) {
    const existing = await prisma.community.findUnique({ where: { slug: input.slug } });
    if (existing) throw new AppError(409, 'Community slug already exists');

    const community = await prisma.community.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        category: input.category,
      },
    });
    await invalidateCache('communities:*');
    return community;
  },

  async getAll(query: CommunitiesQuery = { limit: 20 }) {
    const { cursor, limit = 20 } = query;
    const cacheKey = !cursor ? `communities:list:${limit}` : null;

    if (cacheKey) {
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;
    }

    const communities = await prisma.community.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { _count: { select: { members: true, posts: true } } },
    });
    const hasMore = communities.length > limit;
    const items = hasMore ? communities.slice(0, -1) : communities;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    const result = {
      items: items.map((c: (typeof communities)[number]) => ({
        ...c,
        memberCount: c._count.members,
        postCount: c._count.posts,
        _count: undefined,
      })),
      hasMore,
      nextCursor,
    };

    if (cacheKey) {
      await setCache(cacheKey, result, 300); // 5 min TTL for primary campus groups list
    }

    return result;
  },

  async getBySlug(slug: string, userId?: string) {
    const cacheKey = !userId ? `communities:slug:${slug}` : null;
    if (cacheKey) {
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;
    }

    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        _count: { select: { members: true, posts: true } },
        rules: { orderBy: { orderNum: 'asc' } },
        members: userId ? { where: { userId }, select: { id: true } } : false,
      },
    });
    if (!community) throw new AppError(404, 'Community not found');

    const result = {
      ...community,
      memberCount: community._count.members,
      postCount: community._count.posts,
      isMember: Array.isArray(community.members) && community.members.length > 0,
      _count: undefined,
      members: undefined,
    };
    if (cacheKey) {
      await setCache(cacheKey, result, 300); // 5 min TTL
    }
    return result;
  },

  async join(communityId: string, userId: string) {
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId },
      update: {},
    });
    await invalidateCache('communities:*');
    await invalidateCache('feed:*');
    return { success: true };
  },

  async leave(communityId: string, userId: string) {
    await prisma.communityMember.deleteMany({
      where: { userId, communityId },
    });
    await invalidateCache('communities:*');
    await invalidateCache('feed:*');
    return { success: true };
  },

  async getMembers(communityId: string) {
    return prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true, branch: true, year: true, role: true } },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    });
  },
};
