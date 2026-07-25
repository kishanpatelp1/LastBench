import { createWorker } from '../lib/queue.js';
import { moderationQueue, notificationQueue, emailQueue } from '../lib/queue.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export function startWorkers() {
  // ─── Moderation Worker ────────────────────────────────────────────────────
  createWorker('moderation', async (job) => {
    const { postId, content } = job.data as { postId: string; content: string };
    const toxicWords = ['spam', 'scam'];
    const isToxic = toxicWords.some((w) => content.toLowerCase().includes(w));
    if (isToxic) {
      logger.warn({ postId }, '[MODERATION] Post flagged for review');
      // In production: call OpenAI Moderation API and auto-flag
    } else {
      logger.debug({ postId }, '[MODERATION] Post passed check');
    }
  });

  // ─── Notification Worker (M-9: actually creates DB notifications) ─────────
  createWorker('notifications', async (job) => {
    const { recipientId, type, title, body, data } = job.data as {
      recipientId: string;
      type: string;
      title: string;
      body?: string;
      data?: Record<string, unknown>;
    };

    await prisma.notification.create({
      data: {
        recipientId,
        type: type as never,
        title,
        body,
        // Cast via JSON round-trip to satisfy Prisma's InputJsonValue constraint
        data: data ? (JSON.parse(JSON.stringify(data)) as never) : undefined,
      },
    });

    logger.info({ recipientId, type }, '[NOTIFICATION] Created notification');
  });

  // ─── Email Worker (M-9: sends real emails via Resend) ────────────────────
  createWorker('email', async (job) => {
    const { to, subject, token, username } = job.data as Record<string, string>;

    if (!env.RESEND_API_KEY) {
      logger.warn({ to, subject }, '[EMAIL] RESEND_API_KEY not set — skipping email');
      return;
    }

    try {
      // FRONTEND_URL (not CORS_ORIGIN) is the documented "public URL of the
      // frontend" — the two are separate env vars that default to the same
      // localhost value in dev but can be set inconsistently in production
      // (e.g. CORS_ORIGIN pointing at a bare API-allowed origin while
      // FRONTEND_URL is the real Vercel domain). Using CORS_ORIGIN here
      // would silently put the wrong domain in verify/reset emails while
      // Google OAuth redirects (which use FRONTEND_URL) still worked fine.
      const frontendUrl = env.FRONTEND_URL;

      let html = '';
      if (job.name === 'verify-email') {
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        html = `
          <h2>Welcome to LastBench, ${username}!</h2>
          <p>Click below to verify your email address:</p>
          <a href="${verifyUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Verify Email
          </a>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't create an account, ignore this email.</p>
        `;
      } else if (job.name === 'password-reset') {
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        html = `
          <h2>Reset your LastBench password</h2>
          <p>Hi ${username}, click below to set a new password:</p>
          <a href="${resetUrl}" style="background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Reset Password
          </a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, ignore this email — your account is safe.</p>
        `;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LastBench <noreply@lastbench.app>',
          to,
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${response.status} ${error}`);
      }

      logger.info({ to, subject }, '[EMAIL] Sent successfully via Resend');
    } catch (err) {
      logger.error({ err, to, subject }, '[EMAIL] Failed to send');
      throw err; // Re-throw so BullMQ retries the job
    }
  });

  // ─── C-2: Session Cleanup — repeatable job every hour ────────────────────
  // BullMQ repeatable: deletes expired sessions that were never re-used.
  // Without this, the Session table grows by ~150K rows/month with 5K daily users.
  (async () => {
    const cleanupQueue = (await import('../lib/queue.js')).moderationQueue.constructor;
    // Use the emailQueue connection to schedule session cleanup separately
    const { Queue } = await import('bullmq');
    const { redis } = await import('../lib/redis.js');
    const connection = { ...redis.options, maxRetriesPerRequest: null };

    const sessionCleanupQueue = new Queue('session-cleanup', { connection });
    await sessionCleanupQueue.add(
      'purge-expired',
      {},
      {
        repeat: { every: 60 * 60 * 1000 }, // every 1 hour
        jobId: 'session-cleanup-repeatable',
      },
    );

    createWorker('session-cleanup', async () => {
      const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info({ deleted: result.count }, '[SESSION-CLEANUP] Purged expired sessions');
    });

    logger.info('✅ Session cleanup scheduled (hourly)');
  })().catch((err) => logger.error({ err }, 'Failed to schedule session cleanup'));

  logger.info('✅ Background workers started');
}

/**
 * M-9: Helper used by services to enqueue a notification.
 * Call this instead of directly importing notificationQueue.
 */
export async function enqueueNotification(
  recipientId: string,
  type: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>,
) {
  await notificationQueue.add('create', { recipientId, type, title, body, data });
}
