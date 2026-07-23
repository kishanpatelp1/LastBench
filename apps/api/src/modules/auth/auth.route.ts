import { Router, type Response } from 'express';
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
import { env } from '../../config/env.js';
import { passport } from './google.strategy.js';
import { z } from 'zod';

export const authRoutes: Router = Router();

const SESSION_COOKIE = 'session';
const SESSION_TTL_DAYS = 30;

function setSessionCookie(res: Response, rawToken: string) {
  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

/**
 * OAuth callback cookie — uses sameSite: 'none' in production.
 *
 * The Google redirect goes directly from Google to the GOOGLE_CALLBACK_URL
 * and then we redirect to FRONTEND_URL. In production the GOOGLE_CALLBACK_URL
 * MUST be the Vercel domain (e.g. https://<app>.vercel.app/api/auth/google/callback)
 * so Vercel proxies the request to Render. That way this Set-Cookie header is
 * seen by the browser as coming from the Vercel domain — same domain as the
 * frontend — and the cookie is stored and sent correctly on all future requests.
 *
 * sameSite: 'none' + secure: true is belt-and-suspenders for any edge case
 * where the redirect chain passes through different origins.
 */
function setOAuthSessionCookie(res: Response, rawToken: string) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', path: '/' });
}

// POST /api/auth/register
authRoutes.post('/register', authRateLimiter(), validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.validated as never);
    setSessionCookie(res, result.token);
    res.status(201).json({ success: true, data: { user: result.user } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimiter(), validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.validated as never);
    setSessionCookie(res, result.token);
    res.json({ success: true, data: { user: result.user } });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
authRoutes.post('/logout', requireAuth(), async (req, res, next) => {
  try {
    await authService.logout(req.sessionId!);
    clearSessionCookie(res);
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

// ─── Google OAuth ──────────────────────────────────────────────────────────
// session: false — we manage sessions ourselves via httpOnly cookies + Session table.
// This intentionally skips Passport's built-in CSRF state check (no express-session).

// GET /api/auth/google — initiate OAuth consent screen
authRoutes.get(
  '/google',
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] }),
);

// GET /api/auth/google/callback — Google redirects here after user consents
authRoutes.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${env.FRONTEND_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      const user = req.user as { id: string };
      const rawToken = await authService.createSession(user.id);
      setOAuthSessionCookie(res, rawToken);
      res.redirect(`${env.FRONTEND_URL}/feed?oauth=success`);
    } catch {
      res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  },
);
