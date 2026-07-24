import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { emailQueue } from '../../lib/queue.js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput, UpdateProfileInput } from '@lastbench/shared';

/** Hash a raw token with SHA-256 before DB storage (C-1) */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateSessionToken(): string {
  return nanoid(64);
}

function generateSecureToken(): string {
  return nanoid(48);
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const authService = {
  async register(input: RegisterInput) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new AppError(409, 'Email already registered');

    const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
    if (existingUsername) throw new AppError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(input.password, 12);

    // Generate email verification token (H-1)
    const rawVerificationToken = generateSecureToken();
    const verificationTokenHash = hashToken(rawVerificationToken);

    const user = await prisma.user.create({
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
      } as never,
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
      },
    });

    // Auto-join default communities
    const defaults = await prisma.community.findMany({ where: { isDefault: true }, select: { id: true } });
    if (defaults.length > 0) {
      await prisma.communityMember.createMany({
        data: defaults.map((c: { id: string }) => ({ userId: user.id, communityId: c.id })),
        skipDuplicates: true,
      });
    }

    // Queue verification email (H-1)
    await emailQueue.add('verify-email', {
      to: user.email,
      subject: 'Verify your LastBench email',
      token: rawVerificationToken,
      username: user.username,
    });

    const rawToken = generateSessionToken();
    const tokenHash = hashToken(rawToken); // C-1: store hash
    await prisma.session.create({
      data: { userId: user.id, token: tokenHash, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
    });

    return { user, token: rawToken }; // C-1: return raw token to client
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    });

    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid email or password');
    if (user.isBanned) throw new AppError(403, 'Account has been suspended');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

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
        emailVerified: true, createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  // H-4: use typed UpdateProfileInput instead of Record<string, unknown>
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Explicitly pick only allowed fields to prevent privilege escalation (H-4)
    const safeData: UpdateProfileInput = {};
    if (data.displayName !== undefined) safeData.displayName = data.displayName;
    if (data.bio !== undefined) safeData.bio = data.bio;
    if (data.branch !== undefined) safeData.branch = data.branch;
    if (data.year !== undefined) safeData.year = data.year;
    if (data.avatarUrl !== undefined) safeData.avatarUrl = data.avatarUrl;

    return prisma.user.update({
      where: { id: userId },
      data: safeData,
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
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
      } as never,
    });

    if (!user) throw new AppError(400, 'Invalid or expired verification token');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      } as never,
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
      } as never,
    });

    await emailQueue.add('password-reset', {
      to: user.email,
      subject: 'Reset your LastBench password',
      token: rawToken,
      username: user.username,
    });

    return { message: 'If that email exists, a reset link has been sent' };
  },

  // H-2: Reset password
  async resetPassword(token: string, newPassword: string) {
    const tokenHash = hashToken(token);
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      } as never,
    });

    if (!user) throw new AppError(400, 'Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      } as never,
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
    const email = profile.emails?.[0]?.value;
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
            emailVerified: true, createdAt: true,
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
        emailVerified: true, createdAt: true,
      },
    });
    if (existingUser) {
      await prisma.oAuthAccount.create({
        data: { userId: existingUser.id, provider: 'google', providerId: googleId },
      });
      // Google already verified this email — mark it verified on our side too
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true } as never,
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
    while (await prisma.user.findUnique({ where: { username } })) {
      attempt++;
      username = `${base}_${attempt}`;
    }

    const newUser = await prisma.user.create({
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
      } as never,
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
      },
    });

    // Auto-join default communities
    const defaults = await prisma.community.findMany({ where: { isDefault: true }, select: { id: true } });
    if (defaults.length > 0) {
      await prisma.communityMember.createMany({
        data: defaults.map((c: { id: string }) => ({ userId: newUser.id, communityId: c.id })),
        skipDuplicates: true,
      });
    }

    return { ...newUser, isNewUser: true };
  },
};
