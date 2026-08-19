import { Router } from 'express';
import { createCommentSchema, commentQuerySchema, voteSchema, type CreateCommentInput } from '@lastbench/shared';
import { commentService } from './comments.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireVerifiedEmail, optionalAuth } from '../../middleware/auth.middleware.js';

export const commentRoutes: Router = Router();

// optionalAuth: logged-in users need their own vote state echoed back on
// each comment (userVote), same as the posts feed. Previously this route
// had no auth middleware at all, so req.userId was always undefined and
// every comment came back with userVote hardcoded to null even after voting.
commentRoutes.get('/', optionalAuth(), validate(commentQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { postId, cursor, limit, sort } = req.validated as { postId: string; cursor?: string; limit: number; sort: string };
    const result = await commentService.getByPost(postId, sort, cursor, limit, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

commentRoutes.post('/', requireAuth(), requireVerifiedEmail(), validate(createCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentService.create(req.userId!, req.validated as CreateCommentInput);
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

commentRoutes.post('/:id/vote', requireAuth(), requireVerifiedEmail(), validate(voteSchema), async (req, res, next) => {
  try {
    const { type } = req.validated as { type: 'UP' | 'DOWN' };
    const result = await commentService.vote(String(req.params.id), req.userId!, type);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

commentRoutes.delete('/:id', requireAuth(), requireVerifiedEmail(), async (req, res, next) => {
  try {
    const result = await commentService.delete(String(req.params.id), req.userId!, req.userRole!);
    res.json(result);
  } catch (err) { next(err); }
});
