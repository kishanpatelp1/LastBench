import { Router } from 'express';
import { notificationService } from './notifications.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const notificationRoutes: Router = Router();

notificationRoutes.get('/', requireAuth(), async (req, res, next) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = Number(req.query.limit ?? 20);
    const result = await notificationService.getByUser(req.userId!, cursor, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

notificationRoutes.get('/unread-count', requireAuth(), async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.userId!);
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

notificationRoutes.post('/read-all', requireAuth(), async (req, res, next) => {
  try {
    await notificationService.markAllRead(req.userId!);
    res.json({ success: true });
  } catch (err) { next(err); }
});

notificationRoutes.post('/:id/read', requireAuth(), async (req, res, next) => {
  try {
    await notificationService.markRead(String(req.params.id), req.userId!);
    res.json({ success: true });
  } catch (err) { next(err); }
});
