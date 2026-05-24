import { Router } from 'express';
import { registerSchema, loginSchema, updateProfileSchema } from '@lastbench/shared';
import { authService } from './auth.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limit.js';

export const authRoutes = Router();

// POST /api/auth/register
authRoutes.post('/register', authRateLimiter(), validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.validated as never);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimiter(), validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.validated as never);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
authRoutes.post('/logout', requireAuth(), async (req, res, next) => {
  try {
    await authService.logout(req.sessionId!);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
authRoutes.get('/me', requireAuth(), async (req, res, next) => {
  try {
    const user = await authService.getMe(req.userId!);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PATCH /api/auth/profile
authRoutes.patch('/profile', requireAuth(), validate(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.userId!, req.validated as never);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});
