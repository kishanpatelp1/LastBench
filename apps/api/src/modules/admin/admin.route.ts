import { Router } from 'express';
import { z } from 'zod';
import { createReportSchema } from '@lastbench/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole, requireVerifiedEmail } from '../../middleware/auth.middleware.js';
import { prisma } from '../../lib/prisma.js';

export const adminRoutes: Router = Router();

// Submit report (any authenticated, verified user)
adminRoutes.post('/reports', requireAuth(), requireVerifiedEmail(), validate(createReportSchema), async (req, res, next) => {
  try {
    const report = await prisma.report.create({
      data: { reporterId: req.userId!, ...(req.validated as Record<string, unknown>) } as never,
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// H-3: Validated status schema using the actual ReportStatus enum values
const reportStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED'], {
    errorMap: () => ({ message: 'status must be one of: PENDING, REVIEWED, RESOLVED, DISMISSED' }),
  }),
});

// M-6: Cursor-based pagination schema for admin reports list
const reportsQuerySchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED']).optional().default('PENDING'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Admin: Get reports (M-6: now cursor-paginated, consistent with other endpoints)
adminRoutes.get('/reports', requireAuth(), requireRole('ADMIN', 'MODERATOR'), validate(reportsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { status, cursor, limit } = req.validated as { status: string; cursor?: string; limit: number };

    const reports = await prisma.report.findMany({
      where: { status: status as never },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        reporter: { select: { id: true, username: true } },
        post: { select: { id: true, content: true, isDeleted: true, author: { select: { id: true, username: true, isBanned: true } } } },
        comment: { select: { id: true, content: true, isDeleted: true, author: { select: { id: true, username: true, isBanned: true } } } },
      },
    });

    const hasMore = reports.length > limit;
    const items = hasMore ? reports.slice(0, -1) : reports;

    res.json({
      success: true,
      data: {
        items,
        nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
        hasMore,
      },
    });
  } catch (err) { next(err); }
});

// Admin: Resolve report (H-3: body is now Zod-validated against enum)
adminRoutes.patch('/reports/:id', requireAuth(), requireRole('ADMIN', 'MODERATOR'), validate(reportStatusSchema), async (req, res, next) => {
  try {
    const { status } = req.validated as { status: string };
    const report = await prisma.report.update({
      where: { id: req.params.id as string },
      data: { status: status as never, resolvedAt: new Date() },
    });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// Admin/Mod: Ban or unban user
adminRoutes.post('/users/:id/ban', requireAuth(), requireRole('ADMIN', 'MODERATOR'), async (req, res, next) => {
  try {
    const isBanned = req.body?.ban !== false;
    await prisma.user.update({ where: { id: req.params.id as string }, data: { isBanned } });
    res.json({ success: true, isBanned });
  } catch (err) { next(err); }
});

// Admin: Dashboard stats
adminRoutes.get('/stats', requireAuth(), requireRole('ADMIN'), async (_req, res, next) => {
  try {
    const [users, posts, reports, communities] = await Promise.all([
      prisma.user.count(),
      prisma.post.count({ where: { isDeleted: false } }),
      prisma.report.count({ where: { status: 'PENDING' } }),
      prisma.community.count(),
    ]);
    res.json({ success: true, data: { users, posts, reports, communities } });
  } catch (err) { next(err); }
});
