import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { authRoutes } from './modules/auth/auth.route.js';
import { postRoutes } from './modules/posts/posts.route.js';
import { commentRoutes } from './modules/comments/comments.route.js';
import { communityRoutes } from './modules/communities/communities.route.js';
import { notificationRoutes } from './modules/notifications/notifications.route.js';
import { searchRoutes } from './modules/search/search.route.js';
import { adminRoutes } from './modules/admin/admin.route.js';
import { uploadRoutes } from './modules/upload/upload.route.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { logger } from './lib/logger.js';
import passport from 'passport';
import './modules/auth/google.strategy.js'; // registers the strategy as a side-effect

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);

  // ─── Global Middleware ──────────────────────────
  app.use(compression());
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // C-5: Force Content-Disposition: attachment on static uploads (served via /uploads)
    // This prevents browsers from rendering uploaded SVGs/HTML as pages (stored XSS)
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false, // Disabled in development for Vite hot-module reload & tooling
  }));

  const allowedOrigins = env.CORS_ORIGIN.split(',').map((s) => s.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server) or listed origins
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // L-4: Use 'combined' format in production (structured, machine-parseable)
  // In development, 'dev' is colourful and concise for the terminal
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  // Passport: initialize only — no session middleware (we use our own cookie-based sessions)
  app.use(passport.initialize());
  app.use(rateLimiter());

  // ─── Static uploads ────────────────────────────
  // C-5: Only force attachment disposition for potentially dangerous file types
  // (HTML, SVG, XML). Images and videos should be served inline so the lightbox
  // and video player work correctly. Blanket 'attachment' was breaking the UI.
  app.use('/uploads', (req, res, next) => {
    const url = req.url.toLowerCase();
    const isDangerous = /\.(html?|svg|xml|xhtml|php|js|css)(\?.*)?$/.test(url);
    if (isDangerous) {
      res.setHeader('Content-Disposition', 'attachment');
    } else {
      // Serve images/videos inline but with strict type-checking
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
    next();
  }, express.static(env.UPLOAD_DIR));

  // ─── Health Checks (M-3) ────────────────────────
  // /health/live — is the process alive? (for k8s liveness probe)
  app.get('/health/live', (_req, res) => {
    res.json({ success: true, status: 'alive' });
  });

  // /health/ready — are all dependencies reachable? (for k8s readiness probe)
  app.get('/health/ready', async (_req, res) => {
    const checks: Record<string, 'ok' | 'error'> = {};
    let isHealthy = true;

    // Check PostgreSQL
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
      isHealthy = false;
    }

    // Check Redis
    try {
      await redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      isHealthy = false;
    }

    if (!isHealthy) {
      logger.warn({ checks }, 'Health check failed');
    }

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? 'ready' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // Legacy /health alias — Railway uses this by default
  app.get('/health', async (_req, res) => {
    try {
      await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
      res.json({ success: true, message: 'LastBench API is running', timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ success: false, message: 'Service unavailable' });
    }
  });

  // ─── Routes ─────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/communities', communityRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/upload', uploadRoutes);

  // ─── 404 ────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // ─── Error Handler ─────────────────────────────
  app.use(errorHandler);

  return app;
}
