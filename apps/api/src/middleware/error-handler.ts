import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Turn a Prisma "known request" error into a friendly AppError.
 *
 * Every service in this app does a check-then-write (e.g. "is this username
 * taken?" then "create the user"). Under concurrent requests that check can
 * pass for two requests at once, and the *second* write fails at the DB
 * unique-constraint level, not at the check. Without this, that race turns
 * into a raw "Internal server error" instead of the same friendly message
 * the pre-check would have given. Centralizing it here means every module
 * (auth, posts, comments, communities, ...) gets this safety for free.
 */
function normalizePrismaError(err: unknown): AppError | null {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return null;

  switch (err.code) {
    case 'P2002': {
      const target = (err.meta?.target as string[] | undefined)?.join(', ');
      return new AppError(409, target ? `${target} already in use` : 'That value is already in use', 'CONFLICT');
    }
    case 'P2025':
      return new AppError(404, 'The requested resource was not found', 'NOT_FOUND');
    case 'P2003':
      return new AppError(400, 'Related resource does not exist', 'BAD_REQUEST');
    default:
      return null;
  }
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizePrismaError(err);
  if (normalized) {
    err = normalized;
  }

  // M-1: Use pino structured logging instead of console.error
  // Never log stack traces in production responses
  logger.error(
    {
      err: { message: err.message, name: err.name },
      req: { method: req.method, url: req.url, ip: req.ip },
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
    'Request error',
  );

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      success: false,
      error: err.message,
      code: err.code,
    };
    // H-7: Attach field-level errors if present (set by validate.ts)
    const withErrors = err as AppError & { errors?: Record<string, string> };
    if (withErrors.errors) {
      body.errors = withErrors.errors;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  // Generic 500 — never expose internal details to client
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
