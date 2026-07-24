import { z } from 'zod';

// ─── Create Comment ──────────────────────────────────
export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment is required').max(5000),
  postId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  isAnonymous: z.boolean().default(true),
});

// ─── Update Comment ──────────────────────────────────
export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── Comment Query ───────────────────────────────────
export const commentQuerySchema = z.object({
  postId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['best', 'new', 'old']).default('best'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CommentQuery = z.infer<typeof commentQuerySchema>;
