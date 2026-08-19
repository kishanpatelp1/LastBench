import { Router, type Response } from 'express';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterInput,
  type LoginInput,
  type UpdateProfileInput,
} from '@lastbench/shared';
import { authService } from './auth.service.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth, requireVerifiedEmail } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limit.js';
import { env } from '../../config/env.js';
import { passport } from './google.strategy.js';
import { z } from 'zod';
import { generateSecureToken } from '../../lib/tokens.js';

export const authRoutes: Router = Router();

const SESSION_COOKIE = 'session';
const SESSION_TTL_DAYS = 30;

function getCookieOptions(maxAge?: number) {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/',
    ...(maxAge !== undefined ? { maxAge } : {}),
  };
}

function setSessionCookie(res: Response, rawToken: string) {
  res.cookie(SESSION_COOKIE, rawToken, getCookieOptions(SESSION_TTL_DAYS * 24 * 60 * 60 * 1000));
}

function setOAuthSessionCookie(res: Response, rawToken: string) {
  setSessionCookie(res, rawToken);
}

function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, getCookieOptions());
}

// POST /api/auth/register
authRoutes.post('/register', authRateLimiter(), validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.validated as RegisterInput);
    res.status(201).json({ success: true, data: { user: result.user, requireVerification: result.requireVerification, message: result.message } });
  } catch (err) { next(err); }
});

// POST /api/auth/login
authRoutes.post('/login', authRateLimiter(), validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.validated as LoginInput);
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

// GET /api/auth/user/:username — public profile lookup
authRoutes.get('/user/:username', async (req, res, next) => {
  try {
    const user = await authService.getByUsername(String(req.params.username));
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// PATCH /api/auth/profile
authRoutes.patch('/profile', requireAuth(), requireVerifiedEmail(), validate(updateProfileSchema), async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.userId!, req.validated as UpdateProfileInput);
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

const resendVerificationSchema = z.object({ email: z.string().trim().toLowerCase().email('Invalid email address') });

// POST /api/auth/resend-verification — resend verification email using rate-limiting
// to prevent inbox spamming without requiring an active authenticated session.
authRoutes.post('/resend-verification', authRateLimiter(), validate(resendVerificationSchema), async (req, res, next) => {
  try {
    const { email } = req.validated as { email: string };
    const result = await authService.resendVerification(email);
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
// CSRF protection: we generate a cryptographically secure random state token stored
// in a short-lived, httpOnly cookie (oauth_state) and verify it upon callback.

const googleConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const OAUTH_STATE_COOKIE = 'oauth_state';

// GET /api/auth/google — initiate OAuth consent screen with CSRF state token
authRoutes.get('/google', (req, res, next) => {
  // GOOGLE_CLIENT_ID/SECRET are optional env vars — if a deployment hasn't
  // configured Google sign-in, fail soft with a clear error instead of
  // handing the browser off to Google with an empty/invalid clientID
  if (!googleConfigured) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
    return;
  }

  // Generate high-entropy state token and bind it in an httpOnly cookie (10 min TTL)
  const stateToken = generateSecureToken();
  res.cookie(OAUTH_STATE_COOKIE, stateToken, getCookieOptions(10 * 60 * 1000));

  passport.authenticate('google', {
    session: false,
    scope: ['profile', 'email'],
    state: stateToken,
  })(req, res, next);
});

// GET /api/auth/google/callback — Google redirects here after user consents
authRoutes.get('/google/callback', (req, res, next) => {
  if (!googleConfigured) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_not_configured`);
    return;
  }

  const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  const returnedState = req.query.state as string | undefined;

  // Consume and clear the state cookie immediately to prevent replay attacks
  res.clearCookie(OAUTH_STATE_COOKIE, getCookieOptions());

  // Strict CSRF state verification
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_csrf_failed`);
    return;
  }

  passport.authenticate(
    'google',
    { session: false },
    async (err: Error | null, user: { id: string; onboardingCompleted?: boolean; branch?: string | null; year?: number | null } | false) => {
      if (err || !user) {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
        return;
      }
      try {
        const rawToken = await authService.createSession(user.id);
        setOAuthSessionCookie(res, rawToken);

        // Route based on explicit onboardingCompleted flag
        const needsOnboarding = !user.onboardingCompleted;
        res.redirect(`${env.FRONTEND_URL}/${needsOnboarding ? 'onboarding' : 'feed'}?oauth=success`);
      } catch {
        res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
      }
    },
  )(req, res, next);
});
