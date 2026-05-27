import { createWorker } from '../lib/queue.js';

export function startWorkers() {
  // Moderation worker
  createWorker('moderation', async (job) => {
    const { postId, content } = job.data as { postId: string; content: string };
    // AI moderation placeholder - in production, call OpenAI Moderation API
    console.log(`[MODERATION] Checking post ${postId}: "${content.slice(0, 50)}..."`);
    // Simulate AI check
    const toxicWords = ['spam', 'scam'];
    const isToxic = toxicWords.some((w) => content.toLowerCase().includes(w));
    if (isToxic) {
      console.log(`[MODERATION] ⚠️ Post ${postId} flagged for review`);
    }
  });

  // Notification worker
  createWorker('notifications', async (job) => {
    const { recipientId, type, title, body } = job.data as Record<string, string>;
    console.log(`[NOTIFICATION] Sending to ${recipientId}: ${title}`);
    // In production, send push notification
  });

  // Email worker
  createWorker('email', async (job) => {
    const { to, subject } = job.data as Record<string, string>;
    console.log(`[EMAIL] Sending to ${to}: ${subject}`);
    // In production, use Resend API
  });

  console.log('✅ Background workers started');
}
