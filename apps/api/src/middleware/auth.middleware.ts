import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { AppError } from './error-handler.js';

// Extend Express Request to carry auth context
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      sessionId?: string;
    }
  }
}

export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new AppError(401, 'Authentication required');
      }

      const token = authHeader.slice(7);
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: { select: { id: true, role: true, isBanned: true } } },
      });

      if (!session || session.expiresAt < new Date()) {
        if (session) {
          await prisma.session.delete({ where: { id: session.id } });
        }
        throw new AppError(401, 'Session expired');
      }

      if (session.user.isBanned) {
        throw new AppError(403, 'Account has been suspended');
      }

      req.userId = session.user.id;
      req.userRole = session.user.role;
      req.sessionId = session.id;

      next();
    } catch (err) {
      next(err);
    }
  };
}

export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const session = await prisma.session.findUnique({
          where: { token },
          include: { user: { select: { id: true, role: true, isBanned: true } } },
        });

        if (session && session.expiresAt > new Date() && !session.user.isBanned) {
          req.userId = session.user.id;
          req.userRole = session.user.role;
          req.sessionId = session.id;
        }
      }
      next();
    } catch {
      next();
    }
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      next(new AppError(403, 'Insufficient permissions'));
      return;
    }
    next();
  };
}
