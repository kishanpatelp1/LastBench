import { Router } from 'express';
import { createPostSchema, feedQuerySchema, voteSchema, pollVoteSchema } from '@lastbench/shared';
import { postService } from './posts.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.middleware.js';

export const postRoutes: Router = Router();

// GET /api/posts — Feed
postRoutes.get('/', optionalAuth(), validate(feedQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await postService.getFeed(req.validated as never, req.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// GET /api/posts/:id
postRoutes.get('/:id', optionalAuth(), async (req, res, next) => {
  try {
    const post = await postService.getById(String(req.params.id), req.userId);
    res.json({ success: true, data: post });
  } catch (err) { next(err); }
});

// POST /api/posts
postRoutes.post('/', requireAuth(), validate(createPostSchema), async (req, res, next) => {
  try {
    const post = await postService.create(req.userId!, req.validated as never);
    res.status(201).json({ success: true, data: post });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/vote
postRoutes.post('/:id/vote', requireAuth(), validate(voteSchema), async (req, res, next) => {
  try {
    const result = await postService.vote(String(req.params.id), req.userId!, req.validated as never);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/posts/:id/poll/vote
postRoutes.post('/:id/poll/vote', requireAuth(), validate(pollVoteSchema), async (req, res, next) => {
  try {
    const { optionId } = req.validated as { optionId: string };
    const result = await postService.votePoll(String(req.params.id), req.userId!, optionId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// DELETE /api/posts/:id
postRoutes.delete('/:id', requireAuth(), async (req, res, next) => {
  try {
    const result = await postService.delete(String(req.params.id), req.userId!, req.userRole!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
