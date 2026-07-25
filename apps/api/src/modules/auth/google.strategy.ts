import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from '../../config/env.js';
import { authService } from './auth.service.js';
import { logger } from '../../lib/logger.js';

logger.info(
  {
    hasClientID: !!env.GOOGLE_CLIENT_ID,
    clientIDPrefix: env.GOOGLE_CLIENT_ID ? `${env.GOOGLE_CLIENT_ID.substring(0, 15)}...` : 'MISSING',
    callbackURL: env.GOOGLE_CALLBACK_URL,
  },
  '🔑 Initializing Google OAuth Strategy',
);

/**
 * Google OAuth 2.0 Strategy — session: false
 *
 * We do NOT use express-session. Our auth is entirely cookie-based with our
 * own Session table. Disabling Passport's built-in session support means we
 * lose the automatic CSRF "state" validation. Acceptable for this project.
 *
 * IMPORTANT — GOOGLE_CALLBACK_URL must route through the FRONTEND proxy:
 *   Dev:  http://localhost:3000/api/auth/google/callback  (Vite → API)
 *   Prod: https://<vercel-domain>/api/auth/google/callback  (Vercel → Render)
 *
 * This ensures the Set-Cookie header in the callback response is seen by the
 * browser as coming from the frontend domain, not onrender.com, so the cookie
 * is stored correctly and sent on all subsequent proxied API calls.
 */
// Only register the strategy when real credentials are present. An empty
// clientID/clientSecret would still construct "successfully" and defer the
// failure to the moment a user clicks the button (Google returns its own
// generic error page). The routes in auth.route.ts also check
// `googleConfigured` before invoking passport.authenticate, so this guard
// is belt-and-suspenders against ever calling authenticate('google') with
// no strategy registered at all (which throws synchronously).
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await authService.findOrCreateGoogleUser(profile);
          done(null, user as Express.User);
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
} else {
  logger.warn('Google OAuth not configured (GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing) — /auth/google will redirect with an error');
}

// No serializeUser/deserializeUser — we never use req.session for auth
export { passport };
