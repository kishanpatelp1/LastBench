import { Router } from 'express';
import { z } from 'zod';
import {
  createCommunitySchema,
  updateCommunitySchema,
  communitiesQuerySchema,
  type CommunitiesQuery,
} from '@lastbench/shared';
import { communityService } from './communities.service.js';
import { validate } from '../../middleware/validate.js';
import { optionalAuth, requireAuth, requireVerifiedEmail } from '../../middleware/auth.middleware.js';

export const communityRoutes: Router = Router();

// ─── List all communities (paginated) ───────────────────────────────────────
communityRoutes.get('/', optionalAuth(), validate(communitiesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await communityService.getAll(req.validated as CommunitiesQuery, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Get a single community by slug ─────────────────────────────────────────
communityRoutes.get('/:slug', optionalAuth(), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const community = await communityService.getBySlug(slug, req.userId);
    res.json({ success: true, data: community });
  } catch (err) { next(err); }
});

// ─── Get members for a community (by slug, paginated) ───────────────────────
communityRoutes.get('/:slug/members', async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const result = await communityService.getMembers(slug, { cursor, limit });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Create a new community ──────────────────────────────────────────────────
// Requires auth + verified email. Creator is auto-added as OWNER.
communityRoutes.post('/', requireAuth(), requireVerifiedEmail(), validate(createCommunitySchema), async (req, res, next) => {
  try {
    const community = await communityService.create(req.validated as never, req.userId!);
    res.status(201).json({ success: true, data: community });
  } catch (err) { next(err); }
});

// ─── Update community info (name, description, avatar, banner) ───────────────
// Only the OWNER or a MOD can do this. Permission check is inside the service.
communityRoutes.patch('/:slug', requireAuth(), requireVerifiedEmail(), validate(updateCommunitySchema), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const updated = await communityService.update(slug, req.userId!, req.validated as never);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});

// ─── Join a community ────────────────────────────────────────────────────────
communityRoutes.post('/:id/join', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await communityService.join(id, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Leave a community ───────────────────────────────────────────────────────
communityRoutes.post('/:id/leave', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const result = await communityService.leave(id, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Change a member's role (OWNER only) ─────────────────────────────────────
const updateRoleSchema = z.object({
  role: z.enum(['MOD', 'MEMBER']),
});

communityRoutes.patch('/:slug/members/:userId/role', requireAuth(), requireVerifiedEmail(), validate(updateRoleSchema), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const userId = req.params.userId as string;
    const { role } = req.validated as { role: 'MOD' | 'MEMBER' };
    const result = await communityService.updateMemberRole(slug, userId, role, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Transfer ownership (OWNER only) ─────────────────────────────────────────
communityRoutes.post('/:slug/transfer-ownership', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const { newOwnerId } = req.body as { newOwnerId?: string };
    if (!newOwnerId || typeof newOwnerId !== 'string') {
      res.status(400).json({ success: false, error: 'newOwnerId is required' });
      return;
    }
    const result = await communityService.transferOwnership(slug, newOwnerId, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Remove a member (OWNER, MOD, or System ADMIN) ───────────────────────────
communityRoutes.delete('/:slug/members/:userId', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const userId = req.params.userId as string;
    const result = await communityService.removeMember(slug, userId, req.userId!, req.userRole);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ─── Delete a community (Group OWNER or System ADMIN) ────────────────────────
communityRoutes.delete('/:slug', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const slug = req.params.slug as string;
    const result = await communityService.delete(slug, req.userId!, req.userRole);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
