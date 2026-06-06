import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { CreateCommunityInput } from '@lastbench/shared';

export const communityService = {
  async create(input: CreateCommunityInput) {
    const existing = await prisma.community.findUnique({ where: { slug: input.slug } });
    if (existing) throw new AppError(409, 'Community slug already exists');

    return prisma.community.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        college: input.college,
        category: input.category,
      },
    });
  },

  async getAll(college?: string) {
    const where = college ? { college } : {};
    const communities = await prisma.community.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true, posts: true } } },
    });
    return communities.map((c) => ({
      ...c,
      memberCount: c._count.members,
      postCount: c._count.posts,
      _count: undefined,
    }));
  },

  async getBySlug(slug: string, userId?: string) {
    const community = await prisma.community.findUnique({
      where: { slug },
      include: {
        _count: { select: { members: true, posts: true } },
        rules: { orderBy: { orderNum: 'asc' } },
        members: userId ? { where: { userId }, select: { id: true } } : false,
      },
    });
    if (!community) throw new AppError(404, 'Community not found');

    return {
      ...community,
      memberCount: community._count.members,
      postCount: community._count.posts,
      isMember: Array.isArray(community.members) && community.members.length > 0,
      _count: undefined,
      members: undefined,
    };
  },

  async join(communityId: string, userId: string) {
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId },
      update: {},
    });
    return { success: true };
  },

  async leave(communityId: string, userId: string) {
    await prisma.communityMember.deleteMany({
      where: { userId, communityId },
    });
    return { success: true };
  },

  async getMembers(communityId: string) {
    return prisma.communityMember.findMany({
      where: { communityId },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'desc' },
      take: 50,
    });
  },
};
