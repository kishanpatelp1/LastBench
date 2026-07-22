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

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
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
