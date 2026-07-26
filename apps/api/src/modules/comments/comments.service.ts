import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { enqueueNotification } from '../../workers/index.js';
import type { CreateCommentInput } from '@lastbench/shared';
import type { Prisma } from '@prisma/client';
import { sanitizeInput } from '../../lib/sanitize.js';

export const commentService = {
  async create(authorId: string, input: CreateCommentInput) {
    const post = await prisma.post.findUnique({ where: { id: input.postId, isDeleted: false } });
    if (!post) throw new AppError(404, 'Post not found');

    let depth = 0;
    if (input.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: input.parentId } });
      if (!parent || parent.postId !== input.postId) throw new AppError(400, 'Invalid parent comment');
      depth = parent.depth + 1;
    }

    const comment = await prisma.comment.create({
      data: {
        authorId,
        postId: input.postId,
        parentId: input.parentId ?? null,
        content: sanitizeInput(input.content),
        isAnonymous: input.isAnonymous ?? true,
        depth,
      },
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await prisma.post.update({
      where: { id: input.postId },
      data: { commentCount: { increment: 1 } },
    });

    // M-9: Notify post author when someone comments (skip self-notifications)
    if (post.authorId && post.authorId !== authorId) {
      await enqueueNotification(
        post.authorId,
        'COMMENT',
        'New comment on your post',
        `Someone commented on your post.`,
        { postId: input.postId, commentId: comment.id },
      );
    }

    // M-9: Notify parent comment author when someone replies
    if (input.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { authorId: true },
      });
      if (parent && parent.authorId !== authorId) {
        await enqueueNotification(
          parent.authorId,
          'REPLY',
          'New reply to your comment',
          `Someone replied to your comment.`,
          { postId: input.postId, commentId: comment.id },
        );
      }
    }

    return this.formatComment(comment);
  },

  async getByPost(postId: string, sort: string = 'best', cursor?: string, limit: number = 20) {
    const orderBy = sort === 'new' ? [{ createdAt: 'desc' as const }]
      : sort === 'old' ? [{ createdAt: 'asc' as const }]
      : [{ score: 'desc' as const }, { createdAt: 'desc' as const }];

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, isDeleted: false },
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { replies: true } },
        replies: {
          where: { isDeleted: false },
          take: 3,
          orderBy: { score: 'desc' },
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { replies: true } },
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, -1) : comments;

    return {
      items: items.map((c: (typeof items)[number]) => ({
        ...this.formatComment(c),
        replyCount: c._count.replies,
        replies: c.replies.map((r: (typeof c.replies)[number]) => ({
          ...this.formatComment(r),
          replyCount: (r as unknown as { _count: { replies: number } })._count.replies,
        })),
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      hasMore,
    };
  },

  async vote(commentId: string, userId: string, type: 'UP' | 'DOWN') {
    // C-3: Atomic transaction prevents double-vote race conditions
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.vote.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });

      let scoreDelta = 0;
      if (existing) {
        if (existing.type === type) {
          await tx.vote.delete({ where: { id: existing.id } });
          scoreDelta = type === 'UP' ? -1 : 1;
        } else {
          await tx.vote.update({ where: { id: existing.id }, data: { type } });
          scoreDelta = type === 'UP' ? 2 : -2;
        }
      } else {
        await tx.vote.create({ data: { userId, commentId, type } });
        scoreDelta = type === 'UP' ? 1 : -1;
      }

      const updated = await tx.comment.update({
        where: { id: commentId },
        data: { score: { increment: scoreDelta } },
        select: { score: true },
      });

      return { commentId, score: updated.score };
    });

    return result;
  },

  formatComment(comment: Record<string, unknown>) {
    const isAnon = comment.isAnonymous as boolean;
    const author = comment.author as Record<string, unknown>;
    return {
      id: comment.id,
      content: comment.content,
      isAnonymous: isAnon,
      score: comment.score,
      depth: comment.depth,
      createdAt: comment.createdAt,
      author: isAnon
        ? { id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null }
        : author,
      userVote: null,
    };
  },
};
