import { Router } from 'express';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@lastbench/shared';
import { authService } from './auth.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limit.js';
import { z } from 'zod';

export const authRoutes: Router = Router();

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

// GET /api/auth/verify-email?token=... (H-1)
const verifyEmailSchema = z.object({ token: z.string().min(1) });
authRoutes.get('/verify-email', validate(verifyEmailSchema, 'query'), async (req, res, next) => {
  try {
    const { token } = req.validated as { token: string };
    const result = await authService.verifyEmail(token);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// POST /api/auth/forgot-password (H-2)
authRoutes.post(
  '/forgot-password',
  authRateLimiter(),
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.validated as { email: string };
      const result = await authService.forgotPassword(email);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
);

// POST /api/auth/reset-password (H-2)
authRoutes.post(
  '/reset-password',
  authRateLimiter(),
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { token, password } = req.validated as { token: string; password: string };
      const result = await authService.resetPassword(token, password);
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  },
);
