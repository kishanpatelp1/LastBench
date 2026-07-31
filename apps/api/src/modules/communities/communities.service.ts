import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import type { CreateCommunityInput, UpdateCommunityInput, CommunitiesQuery } from '@lastbench/shared';
import { getCache, setCache, invalidateCache } from '../../lib/redis.js';

// Shape returned for every community list / detail response
function formatCommunity(community: Record<string, unknown>, _userId?: string) {
  const counts = community._count as { members?: number; posts?: number } | undefined;
  const memberships = community.members as Array<{ role: string }> | undefined;

  const userMembership = memberships?.[0]; // single filtered record
  const userRole = userMembership?.role ?? null;

  return {
    ...community,
    memberCount: counts?.members ?? 0,
    postCount: counts?.posts ?? 0,
    isMember: !!userMembership,
    userRole,    // 'OWNER' | 'MOD' | 'MEMBER' | null
    _count: undefined,
    members: undefined,
  };
}

export const communityService = {
  // Create a new community and automatically add the creator as OWNER
  async create(input: CreateCommunityInput, creatorId: string) {
    const slug = input.slug.toLowerCase().trim();
    const name = input.name.trim();

    const [slugTaken, nameTaken] = await Promise.all([
      prisma.community.findFirst({ where: { slug: { equals: slug, mode: 'insensitive' } } }),
      prisma.community.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } }),
    ]);

    if (slugTaken) throw new AppError(409, `A group with handle g/${slug} already exists`);
    if (nameTaken) throw new AppError(409, `A group named "${name}" already exists`);

    // Create the community and add the creator as OWNER in one transaction
    const community = await prisma.$transaction(async (tx) => {
      const newCommunity = await tx.community.create({
        data: { name, slug, description: input.description, category: input.category },
      });

      await tx.communityMember.create({
        data: { userId: creatorId, communityId: newCommunity.id, role: 'OWNER' },
      });

      return newCommunity;
    });

    await invalidateCache('communities:*');
    return community;
  },

  // Update group info — caller must have verified they're owner/mod before calling
  async update(slug: string, userId: string, input: UpdateCommunityInput) {
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: community.id } },
    });

    if (!membership || !['OWNER', 'MOD'].includes(membership.role)) {
      throw new AppError(403, 'Only the group owner or moderators can edit group settings');
    }

    const updated = await prisma.community.update({
      where: { id: community.id },
      data: {
        ...(input.description !== undefined && { description: input.description }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
        ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
      },
    });

    await invalidateCache('communities:*');
    return updated;
  },

  async getAll(query: CommunitiesQuery = { limit: 20 }, userId?: string) {
    const { cursor, limit = 20 } = query;
    const cacheKey = !userId && !cursor ? `communities:list:${limit}` : null;

    if (cacheKey) {
      const cached = await getCache<Record<string, unknown>>(cacheKey);
      if (cached) return cached;
    }

    const communities = await prisma.community.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { members: true, posts: true } },
        members: userId ? { where: { userId }, select: { id: true, role: true } } : false,
      },
    });

    const hasMore = communities.length > limit;
    const items = hasMore ? communities.slice(0, -1) : communities;

    const result = {
      items: items.map((c) => formatCommunity(c as unknown as Record<string, unknown>, userId)),
      hasMore,
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
    };

    if (cacheKey) await setCache(cacheKey, result, 300);
    return result;
  },

  async getBySlug(slug: string, userId?: string) {
    // Only cache anonymous views (no userId) — authenticated views include isMember/userRole
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
        // Fetch only the current user's membership record (empty array = not a member)
        members: userId
          ? { where: { userId }, select: { id: true, role: true } }
          : false,
      },
    });

    if (!community) throw new AppError(404, 'Community not found');

    const result = formatCommunity(community as unknown as Record<string, unknown>, userId);

    if (cacheKey) await setCache(cacheKey, result, 300);
    return result;
  },

  async join(communityId: string, userId: string) {
    // upsert so hitting "join" twice is idempotent
    await prisma.communityMember.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId, role: 'MEMBER' },
      update: {},
    });
    await invalidateCache('communities:*');
    await invalidateCache('feed:*');
    return { success: true };
  },

  async leave(communityId: string, userId: string) {
    // Owners can't just leave — they must transfer ownership first
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });

    if (membership?.role === 'OWNER') {
      const otherMemberCount = await prisma.communityMember.count({
        where: { communityId, userId: { not: userId } },
      });
      if (otherMemberCount > 0) {
        throw new AppError(400, 'Transfer ownership to another member before leaving');
      }
    }

    await prisma.communityMember.deleteMany({ where: { userId, communityId } });
    await invalidateCache('communities:*');
    await invalidateCache('feed:*');
    return { success: true };
  },

  async getMembers(slug: string, query: { cursor?: string; limit?: number } = {}) {
    const { cursor, limit = 20 } = query;
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const members = await prisma.communityMember.findMany({
      where: { communityId: community.id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, branch: true, year: true },
        },
      },
      orderBy: [
        // Sort OWNER first, then MOD, then MEMBER — and within each group, most recent first
        { role: 'asc' },
        { joinedAt: 'desc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = members.length > limit;
    const items = hasMore ? members.slice(0, -1) : members;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return { items, hasMore, nextCursor };
  },

  // Update a member's role — only the community OWNER can do this
  async updateMemberRole(slug: string, targetUserId: string, newRole: 'MOD' | 'MEMBER', requesterId: string) {
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const [requesterMembership, targetMembership] = await Promise.all([
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: requesterId, communityId: community.id } },
      }),
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: targetUserId, communityId: community.id } },
      }),
    ]);

    if (requesterMembership?.role !== 'OWNER') {
      throw new AppError(403, 'Only the group owner can change member roles');
    }
    if (!targetMembership) {
      throw new AppError(404, 'That user is not a member of this group');
    }
    if (targetMembership.role === 'OWNER') {
      throw new AppError(400, 'Use the transfer ownership feature to change the owner');
    }

    await prisma.communityMember.update({
      where: { userId_communityId: { userId: targetUserId, communityId: community.id } },
      data: { role: newRole },
    });

    return { success: true };
  },

  // Transfer community ownership — current owner becomes MOD, new user becomes OWNER
  async transferOwnership(slug: string, newOwnerId: string, currentOwnerId: string) {
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const [currentOwnerMembership, newOwnerMembership] = await Promise.all([
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: currentOwnerId, communityId: community.id } },
      }),
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: newOwnerId, communityId: community.id } },
      }),
    ]);

    if (currentOwnerMembership?.role !== 'OWNER') {
      throw new AppError(403, 'Only the current owner can transfer ownership');
    }
    if (!newOwnerMembership) {
      throw new AppError(404, 'The new owner must already be a member of this group');
    }

    await prisma.$transaction([
      prisma.communityMember.update({
        where: { userId_communityId: { userId: currentOwnerId, communityId: community.id } },
        data: { role: 'MOD' },
      }),
      prisma.communityMember.update({
        where: { userId_communityId: { userId: newOwnerId, communityId: community.id } },
        data: { role: 'OWNER' },
      }),
    ]);

    await invalidateCache('communities:*');
    return { success: true };
  },

  // Remove a member (Group OWNER, MOD, or System ADMIN)
  async removeMember(slug: string, targetUserId: string, requesterId: string, requesterRole?: string) {
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const isSystemAdmin = requesterRole === 'ADMIN';

    const [requesterMembership, targetMembership] = await Promise.all([
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: requesterId, communityId: community.id } },
      }),
      prisma.communityMember.findUnique({
        where: { userId_communityId: { userId: targetUserId, communityId: community.id } },
      }),
    ]);

    if (!targetMembership) {
      throw new AppError(404, 'That user is not a member');
    }

    if (!isSystemAdmin) {
      if (!requesterMembership || !['OWNER', 'MOD'].includes(requesterMembership.role)) {
        throw new AppError(403, 'Only owner or moderators can remove members');
      }
      if (targetMembership.role === 'OWNER') {
        throw new AppError(400, 'Cannot remove the group owner');
      }
      if (requesterMembership.role === 'MOD' && targetMembership.role === 'MOD') {
        throw new AppError(403, 'Moderators cannot remove other moderators');
      }
    }

    await prisma.communityMember.delete({
      where: { userId_communityId: { userId: targetUserId, communityId: community.id } },
    });

    return { success: true };
  },

  // Delete a community (Group OWNER or System ADMIN)
  async delete(slug: string, userId: string, userRole?: string) {
    const community = await prisma.community.findUnique({ where: { slug } });
    if (!community) throw new AppError(404, 'Community not found');

    const isSystemAdmin = userRole === 'ADMIN';
    const membership = await prisma.communityMember.findUnique({
      where: { userId_communityId: { userId, communityId: community.id } },
    });
    const isGroupOwner = membership?.role === 'OWNER';

    if (!isSystemAdmin && !isGroupOwner) {
      throw new AppError(403, 'Only the group owner or system admin can delete this group');
    }

    await prisma.$transaction(async (tx) => {
      const posts = await tx.post.findMany({
        where: { communityId: community.id },
        select: { id: true },
      });
      const postIds = posts.map((p) => p.id);

      if (postIds.length > 0) {
        await tx.comment.deleteMany({ where: { postId: { in: postIds } } });
        await tx.vote.deleteMany({ where: { postId: { in: postIds } } });
        await tx.report.deleteMany({ where: { postId: { in: postIds } } });
        await tx.post.deleteMany({ where: { communityId: community.id } });
      }

      await tx.communityMember.deleteMany({ where: { communityId: community.id } });
      await tx.communityRule.deleteMany({ where: { communityId: community.id } });
      await tx.community.delete({ where: { id: community.id } });
    });

    await invalidateCache('communities:*');
    await invalidateCache('feed:*');
    return { success: true };
  },
};
