import { Router } from 'express';
import { createCommunitySchema } from '@lastbench/shared';
import { communityService } from './communities.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';

export const communityRoutes = Router();

communityRoutes.get('/', async (req, res, next) => {
  try {
    const college = req.query.college as string | undefined;
    const communities = await communityService.getAll(college);
    res.json({ success: true, data: communities });
  } catch (err) { next(err); }
});

communityRoutes.get('/:slug', async (req, res, next) => {
  try {
    const community = await communityService.getBySlug(String(req.params.slug));
    res.json({ success: true, data: community });
  } catch (err) { next(err); }
});

communityRoutes.post('/', requireAuth(), requireRole('ADMIN'), validate(createCommunitySchema), async (req, res, next) => {
  try {
    const community = await communityService.create(req.validated as never);
    res.status(201).json({ success: true, data: community });
  } catch (err) { next(err); }
});

communityRoutes.post('/:id/join', requireAuth(), async (req, res, next) => {
  try {
    const result = await communityService.join(String(req.params.id), req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

communityRoutes.post('/:id/leave', requireAuth(), async (req, res, next) => {
  try {
    const result = await communityService.leave(String(req.params.id), req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
