import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { emailQueue } from '../../lib/queue.js';
import { logger } from '../../lib/logger.js';
import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@lastbench/shared';
import { hashToken, generateSessionToken, generateSecureToken } from '../../lib/tokens.js';

// Re-export hashToken so existing imports from this module still work
export { hashToken };

/** True if `err` is a Prisma unique-constraint violation on the given field. */
function isUniqueConstraintError(err: unknown, field: string): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    ((err.meta?.target as string[] | undefined)?.includes(field) ?? false)
  );
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const authService = {
  async register(input: RegisterInput) {
    // Case-insensitive pre-checks: "User@x.com"/"user@x.com" and "JohnDoe"/"johndoe"
    // must both be treated as taken, not just an exact-case match.
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new AppError(409, 'Email already registered');

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: input.username, mode: 'insensitive' } },
    });
    if (existingUsername) throw new AppError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Generate email verification token (H-1)
    const rawVerificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(rawVerificationToken);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          displayName: input.displayName ?? input.username,
          passwordHash,
          branch: input.branch,
          year: input.year,
          // Cast entire data object — new fields exist in schema but Prisma client
          // needs prisma generate to be re-run against the migrated DB
          emailVerificationToken: verificationTokenHash,
          emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        select: {
          id: true, email: true, username: true, displayName: true, role: true,
          avatarUrl: true, branch: true, year: true, bio: true,
          emailVerified: true, onboardingCompleted: true, createdAt: true,
        },
      });
    } catch (err) {
      // Two requests can pass the checks above at the same instant (double
      // submit, retried request, etc.) and race to insert — the DB unique
      // constraint is the real source of truth. Translate that race into
      // the same friendly message the pre-check would have given.
      if (isUniqueConstraintError(err, 'email')) throw new AppError(409, 'Email already registered');
      if (isUniqueConstraintError(err, 'username')) throw new AppError(409, 'Username already taken');
      throw err;
    }

    // Every account belongs to the campus-wide General feed. Keep the explicit
    // slug check so this remains true even if its system-default flag changes.
    const defaults = await prisma.community.findMany({
      where: { OR: [{ isDefault: true }, { slug: 'general' }] },
      select: { id: true },
    });
    if (defaults.length > 0) {
      await prisma.communityMember.createMany({
        data: defaults.map((c: { id: string }) => ({ userId: user.id, communityId: c.id })),
        skipDuplicates: true,
      });
    }

    // Queue verification email (H-1). The account must still be usable even
    // if Redis/BullMQ is temporarily unreachable — don't let a queue blip
    // turn a successful signup into a 500 that leaves the user stuck with
    // an email that's "already registered" but no way in.
    try {
      await emailQueue.add('verify-email', {
        to: user.email,
        subject: 'Verify your LastBench email',
        token: rawVerificationToken,
        username: user.username,
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, '[AUTH] Failed to queue verification email');
    }

    return { 
      user, 
      requireVerification: true, 
      message: 'Registration successful. Please verify your email address before logging in.' 
    };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, onboardingCompleted: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    });

    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid email or password');
    if (user.isBanned) throw new AppError(403, 'Account has been suspended');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    if (!user.emailVerified) {
      throw new AppError(403, 'Please verify your email address before logging in.', 'EMAIL_NOT_VERIFIED');
    }

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken); // C-1: store hash
    await prisma.session.create({
      data: { userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token: rawToken }; // C-1: return raw token
  },

  async logout(sessionId: string) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, onboardingCompleted: true, createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async getByUsername(username: string) {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: {
        id: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new AppError(404, 'User profile not found');
    return user;
  },

  // H-4: use typed UpdateProfileInput instead of Record<string, unknown>
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Explicitly pick only allowed fields to prevent privilege escalation (H-4)
    const safeData: Record<string, unknown> = { onboardingCompleted: true };
    if (data.username !== undefined) {
      const existing = await prisma.user.findFirst({
        where: {
          username: { equals: data.username, mode: 'insensitive' },
          NOT: { id: userId },
        },
      });
      if (existing) {
        throw new AppError(409, 'Username already taken. Each student must have a unique campus handle.');
      }
      safeData.username = data.username;
    }
    if (data.displayName !== undefined) safeData.displayName = data.displayName;
    if (data.bio !== undefined) safeData.bio = data.bio;
    if (data.branch !== undefined) safeData.branch = data.branch;
    if (data.year !== undefined) safeData.year = data.year;
    if (data.avatarUrl !== undefined) safeData.avatarUrl = data.avatarUrl || null;

    return prisma.user.update({
      where: { id: userId },
      data: safeData as Prisma.UserUpdateInput,
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, onboardingCompleted: true, createdAt: true,
      },
    });
  },

  // H-1: Email verification
  async verifyEmail(token: string) {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new AppError(400, 'Invalid or expired verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return { message: 'Email verified successfully' };
  },

  // H-2: Forgot password
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    try {
      await emailQueue.add('password-reset', {
        to: user.email,
        subject: 'Reset your LastBench password',
        token: rawToken,
        username: user.username,
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, '[AUTH] Failed to queue password-reset email');
    }

    return { message: 'If that email exists, a reset link has been sent' };
  },

  // Resend the verification email — used when the original link expired,
  // was lost, or landed in spam. Always issues a fresh token so an old,
  // possibly-leaked link stops working once a new one is requested.
  async resendVerification(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, username: true, emailVerified: true },
    });
    if (!user) {
      return { message: 'If an account exists with this email, a verification link has been sent.' };
    }
    if (user.emailVerified) {
      return { message: 'This email address is already verified. You can proceed to log in.' };
    }

    const rawVerificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(rawVerificationToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    try {
      await emailQueue.add('verify-email', {
        to: user.email,
        subject: 'Verify your LastBench email',
        token: rawVerificationToken,
        username: user.username,
      });
    } catch (err) {
      logger.error({ err, userId: user.id }, '[AUTH] Failed to queue resend-verification email');
      throw new AppError(503, 'Could not send email right now. Please try again shortly.');
    }

    return { message: 'Verification email sent' };
  },

  // H-2: Reset password
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) throw new AppError(400, 'Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Invalidate all existing sessions for security
    await prisma.session.deleteMany({ where: { userId: user.id } });

    return { message: 'Password reset successfully. Please log in again.' };
  },

  // OAuth: Create a session token and store its hash — reusable by any OAuth provider
  async createSession(userId: string): Promise<string> {
    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken);
    await prisma.session.create({
      data: { userId, token: tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });
    return rawToken;
  },

  // OAuth: Find or create a user from a Google profile
  async findOrCreateGoogleUser(profile: import('passport-google-oauth20').Profile) {
    const googleId = profile.id;
    // Normalize to match the lowercase/trimmed form used by email/password
    // register+login, so the same person can't end up with two accounts
    // that only differ by email casing.
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    const displayName = profile.displayName;
    const avatarUrl = profile.photos?.[0]?.value ?? null;

    if (!email) throw new AppError(400, 'Google account has no associated email address');

    // 1. OAuthAccount already linked to this Google ID?
    const existingOAuth = await prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider: 'google', providerId: googleId } },
      include: {
        user: {
          select: {
            id: true, email: true, username: true, displayName: true, role: true,
            avatarUrl: true, branch: true, year: true, bio: true,
            emailVerified: true, onboardingCompleted: true, createdAt: true,
          },
        },
      },
    });
    if (existingOAuth) return existingOAuth.user;

    // 2. User exists with this email? Link accounts.
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, onboardingCompleted: true, createdAt: true,
      },
    });
    if (existingUser) {
      await prisma.oAuthAccount.create({
        data: { userId: existingUser.id, provider: 'google', providerId: googleId },
      });
      // Google already verified this email — mark it verified on our side too
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true },
      });
      return { ...existingUser, emailVerified: true };
    }

    // 3. Brand-new user — no password (OAuth-only account)
    const base = (displayName ?? email.split('@')[0])
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 25)
      .replace(/^_|_$/g, '') || 'user';

    let username = base;
    let attempt = 0;
    while (await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })) {
      attempt++;
      username = `${base}_${attempt}`;
    }

    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          email,
          username,
          displayName: displayName ?? username,
          avatarUrl,
          emailVerified: true, // Google already verified the address
          // passwordHash intentionally omitted — nullable in schema
          oauthAccounts: {
            create: { provider: 'google', providerId: googleId },
          },
        },
        select: {
          id: true, email: true, username: true, displayName: true, role: true,
          avatarUrl: true, branch: true, year: true, bio: true,
          emailVerified: true, onboardingCompleted: true, createdAt: true,
        },
      });
    } catch (err) {
      // Concurrent OAuth callbacks for the same brand-new Google account
      // (double-click, two tabs) can both pass the lookups above and race
      // to insert. Recover by re-reading whichever row actually landed
      // instead of surfacing a raw 500 mid-login.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true, email: true, username: true, displayName: true, role: true,
            avatarUrl: true, branch: true, year: true, bio: true,
            emailVerified: true, onboardingCompleted: true, createdAt: true,
          },
        });
        if (winner) {
          await prisma.oAuthAccount.upsert({
            where: { provider_providerId: { provider: 'google', providerId: googleId } },
            update: {},
            create: { userId: winner.id, provider: 'google', providerId: googleId },
          });
          return winner;
        }
      }
      throw err;
    }

    // Every account belongs to the campus-wide General feed. Keep the explicit
    // slug check so this remains true even if its system-default flag changes.
    const defaults = await prisma.community.findMany({
      where: { OR: [{ isDefault: true }, { slug: 'general' }] },
      select: { id: true },
    });
    if (defaults.length > 0) {
      await prisma.communityMember.createMany({
        data: defaults.map((c: { id: string }) => ({ userId: newUser.id, communityId: c.id })),
        skipDuplicates: true,
      });
    }

    return { ...newUser, isNewUser: true };
  },
};
