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

// POST /api/auth/resend-verification — the frontend's "resend" button on
// VerifyEmailPage calls this; it needs an authenticated session (the user
// registered and is logged in, just hasn't clicked the link yet) and is
// rate-limited to stop it being used to spam an inbox.
authRoutes.post('/resend-verification', authRateLimiter(), requireAuth(), async (req, res, next) => {
  try {
    const result = await authService.resendVerification(req.userId!);
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

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

// GET /api/auth/google — initiate OAuth consent screen
authRoutes.get('/google', (req, res, next) => {
  // GOOGLE_CLIENT_ID/SECRET are optional env vars — if a deployment hasn't
  // configured Google sign-in, fail soft with a clear error instead of
  // handing the browser off to Google with an empty/invalid clientID
  // (which surfaces as Google's own generic "Error 401: invalid_client"
  // page — a dead end with no way back to the app).
  if (!googleConfigured) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
    return;
  }
  passport.authenticate('google', { session: false, scope: ['profile', 'email'] })(req, res, next);
});

// GET /api/auth/google/callback — Google redirects here after user consents
//
// Uses passport's custom-callback form (the 3rd argument) instead of the
// declarative { failureRedirect } option. failureRedirect only covers
// `done(null, false)` (bad credentials); it does NOT catch `done(err)`
// thrown from inside the strategy's verify function (e.g. a DB race when
// two tabs finish OAuth at once, or Prisma being briefly unreachable).
// Uncaught, that error falls through to the global JSON error handler and
// the user's browser renders a bare `{"success":false,...}` page instead
// of landing back on /login with a readable message. The callback form
// lets us catch *both* cases here and always end in a redirect.
authRoutes.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
    return;
  }
  passport.authenticate(
    'google',
    { session: false },
    async (err: Error | null, user: { id: string; branch?: string | null; year?: number | null } | false) => {
      if (err || !user) {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
        return;
      }
      try {
        const rawToken = await authService.createSession(user.id);
        setOAuthSessionCookie(res, rawToken);

        // Route based on whether the profile is actually complete, not just
        // "was this account created just now" — this also correctly sends
        // an existing account that never finished onboarding (e.g. it was
        // created via email/password and later linked to Google) through
        // the same profile-completion step, instead of only covering
        // brand-new Google signups.
        const needsOnboarding = !user.branch || user.year == null;
        res.redirect(`${env.FRONTEND_URL}/${needsOnboarding ? 'onboarding' : 'feed'}?oauth=success`);
      } catch {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    },
  )(req, res, next);
});
