import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';

/**
 * Pure token helpers with no database dependency.
 * Pulled out of auth.service.ts so this security-critical logic can be
 * unit-tested without spinning up Postgres/Redis (see lib/tokens.test.ts).
 */

/** Hash a raw token with SHA-256 before DB storage (C-1).
 *  We never store raw session/verification/reset tokens — only their hash —
 *  so a leaked database dump can't be replayed as a live credential. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/** Long, high-entropy token used for session cookies. */
export function generateSessionToken(): string {
  return nanoid(64);
}

/** Slightly shorter token used for one-shot links (email verify, password reset). */
export function generateSecureToken(): string {
  return nanoid(48);
}
