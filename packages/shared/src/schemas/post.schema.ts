import { z } from 'zod';

// ─── Create Post ─────────────────────────────────────
export const createPostSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().min(1, 'Post content is required').max(10000),
  communityId: z.string().cuid(),
  isAnonymous: z.boolean().default(true),
  type: z.enum(['TEXT', 'IMAGE', 'POLL', 'LINK']).default('TEXT'),
  mediaUrls: z.array(z.string().url()).max(4).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
  poll: z
    .object({
      options: z
        .array(z.string().min(1).max(100))
        .min(2, 'Poll must have at least 2 options')
        .max(6, 'Poll can have at most 6 options'),
      expiresAt: z.string().datetime().optional(),
    })
    .optional(),
});

// ─── Update Post ─────────────────────────────────────
export const updatePostSchema = z.object({
  title: z.string().max(300).optional(),
  content: z.string().min(1).max(10000).optional(),
  tags: z.array(z.string().max(30)).max(5).optional(),
});

// ─── Feed Query ──────────────────────────────────────
export const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(['hot', 'new', 'top']).default('hot'),
  timeRange: z.enum(['day', 'week', 'month', 'year', 'all']).default('week'),
  communityId: z.string().optional(),
  college: z.string().optional(),
});

// ─── Vote ────────────────────────────────────────────
export const voteSchema = z.object({
  type: z.enum(['UP', 'DOWN']),
});

// ─── Poll Vote ───────────────────────────────────────
export const pollVoteSchema = z.object({
  optionId: z.string().cuid(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type PollVoteInput = z.infer<typeof pollVoteSchema>;
