import { Router } from 'express';
import { createCommentSchema, commentQuerySchema, voteSchema } from '@lastbench/shared';
import { commentService } from './comments.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const commentRoutes = Router();

commentRoutes.get('/', validate(commentQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { postId, cursor, limit, sort } = req.validated as { postId: string; cursor?: string; limit: number; sort: string };
    const result = await commentService.getByPost(postId, sort, cursor, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

commentRoutes.post('/', requireAuth(), validate(createCommentSchema), async (req, res, next) => {
  try {
    const comment = await commentService.create(req.userId!, req.validated as never);
    res.status(201).json({ success: true, data: comment });
  } catch (err) { next(err); }
});

commentRoutes.post('/:id/vote', requireAuth(), validate(voteSchema), async (req, res, next) => {
  try {
    const { type } = req.validated as { type: 'UP' | 'DOWN' };
    const result = await commentService.vote(String(req.params.id), req.userId!, type);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
