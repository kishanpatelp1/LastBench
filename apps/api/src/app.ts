import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

export function createApp() {
  const app = express();

  // ─── Global Middleware ──────────────────────────
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(rateLimiter());

  // ─── Static uploads ────────────────────────────
  app.use('/uploads', express.static(env.UPLOAD_DIR));

  // ─── Health Check ───────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'LastBench API is running',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
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
