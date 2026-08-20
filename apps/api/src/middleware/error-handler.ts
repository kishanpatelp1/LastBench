import type { Request, Response, NextFunction } from 'express';
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
 * Duck-type a Prisma "known request" error instead of `instanceof
 * Prisma.PrismaClientKnownRequestError`. Prisma's error classes are
 * regenerated per-project by `prisma generate` against a downloaded engine
 * binary; an `instanceof` check silently stops matching if that class
 * identity ever diverges (e.g. two @prisma/client copies in node_modules,
 * or the client being unavailable in this environment). The shape below —
 * `name` + string `code` — is stable across Prisma versions and lets this
 * logic run and be unit-tested without depending on a generated client.
 */
function isPrismaKnownRequestError(
  err: unknown,
): err is { code: string; meta?: { target?: string[] } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'PrismaClientKnownRequestError' &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

/**
 * Turn a Prisma "known request" error into a friendly AppError.
 */
export function normalizePrismaError(err: unknown): AppError | null {
  if (!isPrismaKnownRequestError(err)) return null;

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

/**
 * Turn a Multer upload error into a friendly AppError with proper HTTP status codes (413/400).
 */
export function normalizeMulterError(err: unknown): AppError | null {
  if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'MulterError') {
    const code = (err as { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      return new AppError(413, 'File is too large. Maximum allowed size is 50MB.', 'FILE_TOO_LARGE');
    }
    if (code === 'LIMIT_FILE_COUNT') {
      return new AppError(400, 'Too many files uploaded.', 'TOO_MANY_FILES');
    }
    if (code === 'LIMIT_UNEXPECTED_FILE') {
      return new AppError(400, 'Unexpected file field.', 'UNEXPECTED_FILE');
    }
    return new AppError(400, `Upload error: ${(err as Error).message || 'Invalid upload'}`, 'UPLOAD_ERROR');
  }
  return null;
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const normalized = normalizePrismaError(err) || normalizeMulterError(err);
  if (normalized) {
    err = normalized;
  }

  const isClientError = err instanceof AppError && err.statusCode < 500;
  const logPayload = {
    err: { message: err.message, name: err.name, statusCode: err instanceof AppError ? err.statusCode : 500 },
    req: { method: req.method, url: req.url, ip: req.ip },
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  if (isClientError) {
    logger.info(logPayload, `Client response (${(err as AppError).statusCode}): ${err.message}`);
  } else {
    logger.error(logPayload, 'Request error');
  }

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
