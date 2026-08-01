import { Queue } from 'bullmq';
import nodemailer from 'nodemailer';
import { createWorker, moderationQueue, notificationQueue, emailQueue, connection } from '../lib/queue.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

const smtpTransporter = env.SMTP_USER && env.SMTP_PASS
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

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

  // ─── Email Worker (M-9: sends real emails via SMTP or Resend) ────────────
  createWorker('email', async (job) => {
    const { to, subject, token, username } = job.data as Record<string, string>;

    const hasSmtp = Boolean(smtpTransporter);
    const hasResend = Boolean(env.RESEND_API_KEY);

    if (!hasSmtp && !hasResend) {
      logger.warn({ to, subject }, '[EMAIL] Neither SMTP_USER/PASS nor RESEND_API_KEY set — skipping email');
      return;
    }

    try {
      const frontendUrl = env.FRONTEND_URL;

      let html = '';
      if (job.name === 'verify-email') {
        const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify your LastBench Email</title>
          </head>
          <body style="margin:0;padding:0;background-color:#09080e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09080e;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" style="max-width:540px;background-color:#14121d;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:40px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                    <!-- Brand Header -->
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="background:linear-gradient(135deg, #7c3aed, #a855f7);width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:900;font-size:18px;">LB</td>
                            <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">LastBench</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                      <td style="text-align:left;padding-bottom:24px;">
                        <h1 style="font-size:22px;font-weight:800;color:#ffffff;margin:0 0 12px 0;">Welcome to campus, @${username}! 👋</h1>
                        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 24px 0;">
                          You're one step away from joining your college network. Please verify your email address to unlock your campus feed, branch groups, and live polls.
                        </p>
                        <!-- CTA Button -->
                        <div style="text-align:center;margin:32px 0;">
                          <a href="${verifyUrl}" target="_blank" style="background:linear-gradient(135deg, #7c3aed, #6d28d9);color:#ffffff;padding:14px 36px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 8px 20px rgba(124,58,237,0.4);">
                            Verify My Email Address →
                          </a>
                        </div>
                        <p style="font-size:12px;color:#71717a;line-height:1.5;margin:24px 0 0 0;text-align:center;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${verifyUrl}" style="color:#a78bfa;word-break:break-all;">${verifyUrl}</a>
                        </p>
                      </td>
                    </tr>
                    <!-- Expiration Note -->
                    <tr>
                      <td style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.25);border-radius:12px;padding:12px 16px;text-align:center;color:#c084fc;font-size:12px;font-weight:600;">
                        ⏰ This link will expire in 24 hours.
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.08);margin-top:32px;color:#52525b;font-size:11px;text-align:center;">
                        If you didn't sign up for a LastBench account, you can safely ignore this email.<br>
                        &copy; 2026 LastBench • Campus Unfiltered
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
      } else if (job.name === 'password-reset') {
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your LastBench Password</title>
          </head>
          <body style="margin:0;padding:0;background-color:#09080e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09080e;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" style="max-width:540px;background-color:#14121d;border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:40px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
                    <!-- Brand Header -->
                    <tr>
                      <td align="center" style="padding-bottom:24px;">
                        <table role="presentation" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="background:linear-gradient(135deg, #7c3aed, #a855f7);width:44px;height:44px;border-radius:12px;text-align:center;vertical-align:middle;color:#ffffff;font-weight:900;font-size:18px;">LB</td>
                            <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">LastBench</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <!-- Main Body -->
                    <tr>
                      <td style="text-align:left;padding-bottom:24px;">
                        <h1 style="font-size:22px;font-weight:800;color:#ffffff;margin:0 0 12px 0;">Password Reset Request 🔐</h1>
                        <p style="font-size:14px;color:#a1a1aa;line-height:1.6;margin:0 0 24px 0;">
                          Hi @${username}, we received a request to reset your password. Click the button below to set a new password:
                        </p>
                        <!-- CTA Button -->
                        <div style="text-align:center;margin:32px 0;">
                          <a href="${resetUrl}" target="_blank" style="background:linear-gradient(135deg, #7c3aed, #6d28d9);color:#ffffff;padding:14px 36px;border-radius:9999px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 8px 20px rgba(124,58,237,0.4);">
                            Reset My Password →
                          </a>
                        </div>
                        <p style="font-size:12px;color:#71717a;line-height:1.5;margin:24px 0 0 0;text-align:center;">
                          Or copy and paste this link into your browser:<br>
                          <a href="${resetUrl}" style="color:#a78bfa;word-break:break-all;">${resetUrl}</a>
                        </p>
                      </td>
                    </tr>
                    <!-- Expiration Note -->
                    <tr>
                      <td style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);border-radius:12px;padding:12px 16px;text-align:center;color:#f87171;font-size:12px;font-weight:600;">
                        ⏰ Link expires in 1 hour. If you didn't request this, your account is safe.
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.08);margin-top:32px;color:#52525b;font-size:11px;text-align:center;">
                        &copy; 2026 LastBench • Campus Unfiltered
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;
      }

      if (hasSmtp && smtpTransporter) {
        const from = env.SMTP_FROM || `LastBench <${env.SMTP_USER}>`;
        await smtpTransporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        logger.info({ to, subject }, '[EMAIL] Sent successfully via SMTP (Nodemailer)');
      } else if (hasResend && env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL,
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
      }
    } catch (err) {
      logger.error({ err, to, subject }, '[EMAIL] Failed to send');
      throw err; // Re-throw so BullMQ retries the job
    }
  });

  // ─── C-2: Session Cleanup — repeatable job every hour ────────────────────
  // BullMQ repeatable: deletes expired sessions that were never re-used.
  // Without this, the Session table grows by ~150K rows/month with 5K daily users.
  // Schedule hourly session cleanup job using shared queue connection.
  (async () => {
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
