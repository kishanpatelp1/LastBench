import { Router } from 'express';
import { createReportSchema } from '@lastbench/shared';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { prisma } from '../../lib/prisma.js';

export const adminRoutes = Router();

// Submit report (any authenticated user)
adminRoutes.post('/reports', requireAuth(), validate(createReportSchema), async (req, res, next) => {
  try {
    const report = await prisma.report.create({
      data: { reporterId: req.userId!, ...(req.validated as Record<string, unknown>) } as never,
    });
    res.status(201).json({ success: true, data: report });
  } catch (err) { next(err); }
});

// Admin: Get reports
adminRoutes.get('/reports', requireAuth(), requireRole('ADMIN', 'MODERATOR'), async (req, res, next) => {
  try {
    const status = (req.query.status as string) ?? 'PENDING';
    const reports = await prisma.report.findMany({
      where: { status: status as never },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reporter: { select: { id: true, username: true } },
        post: { select: { id: true, content: true } },
        comment: { select: { id: true, content: true } },
      },
    });
    res.json({ success: true, data: reports });
  } catch (err) { next(err); }
});

// Admin: Resolve report
adminRoutes.patch('/reports/:id', requireAuth(), requireRole('ADMIN', 'MODERATOR'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: { status, resolvedAt: new Date() },
    });
    res.json({ success: true, data: report });
  } catch (err) { next(err); }
});

// Admin: Ban user
adminRoutes.post('/users/:id/ban', requireAuth(), requireRole('ADMIN'), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isBanned: true } });
    res.json({ success: true });
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
