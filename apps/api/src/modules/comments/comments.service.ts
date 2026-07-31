import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { notificationService } from '../notifications/notifications.service.js';
import type { CreateCommentInput } from '@lastbench/shared';
import { Prisma } from '@prisma/client';
import { sanitizeInput } from '../../lib/sanitize.js';
import { formatComment } from './comment.formatter.js';

export const commentService = {
  async create(authorId: string, input: CreateCommentInput) {
    const post = await prisma.post.findUnique({
      where: { id: input.postId },
      select: { authorId: true, isDeleted: true },
    });

    if (!post || post.isDeleted) {
      throw new AppError(404, 'Post not found');
    }

    const comment = await prisma.comment.create({
      data: {
        postId: input.postId,
        authorId,
        parentId: input.parentId,
        content: sanitizeInput(input.content),
        isAnonymous: input.isAnonymous ?? true,
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
      await notificationService.create(
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
        await notificationService.create(
          parent.authorId,
          'REPLY',
          'New reply to your comment',
          `Someone replied to your comment.`,
          { postId: input.postId, commentId: comment.id },
        );
      }
    }

    return formatComment(comment);
  },

  async getByPost(postId: string, sort: string = 'best', cursor?: string, limit: number = 20, userId?: string) {
    const orderBy = sort === 'new' ? [{ createdAt: 'desc' as const }]
      : sort === 'old' ? [{ createdAt: 'asc' as const }]
      : [{ score: 'desc' as const }, { createdAt: 'desc' as const }];

    const voteInclude = userId ? { where: { userId }, select: { type: true } } as const : false;

    const comments = await prisma.comment.findMany({
      where: { postId, parentId: null, isDeleted: false },
      orderBy,
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        _count: { select: { replies: true } },
        votes: voteInclude,
        replies: {
          where: { isDeleted: false },
          take: 3,
          orderBy: { score: 'desc' },
          include: {
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            _count: { select: { replies: true } },
            votes: voteInclude,
          },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, -1) : comments;

    return {
      items: items.map((c: (typeof items)[number]) => ({
        ...formatComment(c),
        replyCount: c._count.replies,
        replies: c.replies.map((r: (typeof c.replies)[number]) => ({
          ...formatComment(r),
          replyCount: (r as unknown as { _count: { replies: number } })._count.replies,
        })),
      })),
      nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
      hasMore,
    };
  },

  async vote(commentId: string, userId: string, type: 'UP' | 'DOWN') {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new AppError(404, 'Comment not found');

    const value = type === 'UP' ? 1 : -1;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existing = await tx.vote.findUnique({
        where: { userId_commentId: { userId, commentId } },
      });

      if (existing) {
        if (existing.type === type) {
          // Toggle off
          await tx.vote.delete({
            where: { userId_commentId: { userId, commentId } },
          });
          await tx.comment.update({
            where: { id: commentId },
            data: { score: { decrement: value } },
          });
        } else {
          // Switch vote
          await tx.vote.update({
            where: { userId_commentId: { userId, commentId } },
            data: { type },
          });
          await tx.comment.update({
            where: { id: commentId },
            data: { score: { increment: value * 2 } },
          });
        }
      } else {
        // New vote
        await tx.vote.create({
          data: { userId, commentId, type },
        });
        await tx.comment.update({
          where: { id: commentId },
          data: { score: { increment: value } },
        });
      }
    });

    return { success: true };
  },

  async delete(commentId: string, userId: string, role: string) {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) throw new AppError(404, 'Comment not found');

    if (comment.authorId !== userId && role !== 'ADMIN' && role !== 'MODERATOR') {
      throw new AppError(403, 'Not authorized to delete this comment');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    await prisma.post.update({
      where: { id: comment.postId },
      data: { commentCount: { decrement: 1 } },
    });

    return { success: true };
  },
};
