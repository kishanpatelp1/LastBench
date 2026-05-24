import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/error-handler.js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import type { RegisterInput, LoginInput } from '@lastbench/shared';

function generateSessionToken(): string {
  return nanoid(64);
}

export const authService = {
  async register(input: RegisterInput) {
    const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingEmail) throw new AppError(409, 'Email already registered');

    const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
    if (existingUsername) throw new AppError(409, 'Username already taken');

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        username: input.username,
        displayName: input.displayName ?? input.username,
        passwordHash,
        college: input.college,
        branch: input.branch,
        year: input.year,
      },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, college: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
      },
    });

    // Auto-join default communities
    const defaults = await prisma.community.findMany({ where: { isDefault: true }, select: { id: true } });
    if (defaults.length > 0) {
      await prisma.communityMember.createMany({
        data: defaults.map((c) => ({ userId: user.id, communityId: c.id })),
        skipDuplicates: true,
      });
    }

    const token = generateSessionToken();
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    return { user, token };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, college: true, branch: true, year: true, bio: true,
        emailVerified: true, passwordHash: true, isBanned: true, createdAt: true,
      },
    });

    if (!user || !user.passwordHash) throw new AppError(401, 'Invalid email or password');
    if (user.isBanned) throw new AppError(403, 'Account has been suspended');

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid email or password');

    const token = generateSessionToken();
    await prisma.session.create({
      data: { userId: user.id, token, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  },

  async logout(sessionId: string) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  },

  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, college: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
        _count: { select: { posts: true, comments: true } },
      },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  },

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, username: true, displayName: true, role: true,
        avatarUrl: true, college: true, branch: true, year: true, bio: true,
        emailVerified: true, createdAt: true,
      },
    });
  },
};
