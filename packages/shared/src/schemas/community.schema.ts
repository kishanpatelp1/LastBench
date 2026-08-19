import { z } from 'zod';
import { REPORT_REASONS } from '../constants/index.js';

const reportReasonValues = REPORT_REASONS.map((r) => r.value) as [string, ...string[]];

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
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  category: z
    .preprocess(
      (val) => (typeof val === 'string' ? val.toLowerCase().trim() : val),
      z.enum(['general', 'academic', 'hostel', 'placement', 'memes', 'events', 'sports', 'clubs', 'market'])
    )
    .optional()
    .default('general'),
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
  category: z.preprocess((v) => (typeof v === 'string' ? v.toLowerCase().trim() || undefined : v), z.enum(['general', 'academic', 'hostel', 'placement', 'memes', 'events', 'sports', 'clubs', 'market']).optional()),
  search: z.preprocess((v) => (typeof v === 'string' ? v.trim() || undefined : v), z.string().max(200).optional()),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ─── Report ──────────────────────────────────────────
export const createReportSchema = z
  .object({
    postId: z.string().min(1).optional(),
    commentId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    reason: z.enum(reportReasonValues, {
      errorMap: () => ({ message: `Reason must be one of: ${reportReasonValues.join(', ')}` }),
    }),
    details: z.preprocess(
      (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
      z.string().max(1000).optional()
    ),
  })
  .superRefine((data, ctx) => {
    const targetCount = [data.postId, data.commentId, data.userId].filter(Boolean).length;
    if (targetCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A report must target exactly one of: postId, commentId, or userId',
        path: ['postId'],
      });
    } else if (targetCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A report cannot target multiple entities simultaneously',
        path: ['postId'],
      });
    }
  });

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type CommunitiesQuery = z.infer<typeof communitiesQuerySchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
