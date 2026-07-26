import { z } from 'zod';

// ─── Create Community ────────────────────────────────
export const createCommunitySchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must be at most 50 characters'),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(500).optional(),
  category: z.enum(['general', 'academic', 'hostel', 'placement', 'memes', 'events', 'sports', 'clubs', 'market']).optional(),
});

// ─── Update Community ────────────────────────────────
export const updateCommunitySchema = z.object({
  name: z.string().min(3).max(50).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

// ─── Search ──────────────────────────────────────────
export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['posts', 'communities', 'all']).default('all'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Query Communities ───────────────────────────────
export const communitiesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Report ──────────────────────────────────────────
export const createReportSchema = z.object({
  postId: z.string().min(1).optional(),
  commentId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  reason: z.enum([
    'spam',
    'harassment',
    'hate_speech',
    'violence',
    'misinformation',
    'nsfw',
    'doxxing',
    'other',
  ]),
  details: z.string().max(1000).optional(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type CommunitiesQuery = z.infer<typeof communitiesQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
