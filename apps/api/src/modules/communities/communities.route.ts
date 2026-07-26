import { Router } from 'express';
import { createCommunitySchema, communitiesQuerySchema, type CommunitiesQuery } from '@lastbench/shared';
import { communityService } from './communities.service.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth, requireAuth, requireVerifiedEmail, requireRole } from '../../middleware/auth.middleware.js';

export const communityRoutes: Router = Router();

communityRoutes.get('/', validate(communitiesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const communities = await communityService.getAll(req.validated as CommunitiesQuery);
    res.json({ success: true, data: communities });
  } catch (err) { next(err); }
});

communityRoutes.get('/:slug', optionalAuth(), async (req, res, next) => {
  try {
    const community = await communityService.getBySlug(String(req.params.slug), req.userId);
    res.json({ success: true, data: community });
  } catch (err) { next(err); }
});

communityRoutes.get('/:id/members', async (req, res, next) => {
  try {
    const members = await communityService.getMembers(String(req.params.id));
    res.json({ success: true, data: members });
  } catch (err) { next(err); }
});

communityRoutes.post('/', requireAuth(), requireRole('ADMIN'), validate(createCommunitySchema), async (req, res, next) => {
  try {
    const community = await communityService.create(req.validated as never);
    res.status(201).json({ success: true, data: community });
  } catch (err) { next(err); }
});

communityRoutes.post('/:id/join', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const result = await communityService.join(String(req.params.id), req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

communityRoutes.post('/:id/leave', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const result = await communityService.leave(String(req.params.id), req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
