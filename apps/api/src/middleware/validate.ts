import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './error-handler.js';

// Extend Express Request to carry validated data
declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
    }
  }
}

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : req.query;
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      next(new AppError(400, JSON.stringify(errors)));
      return;
    }

    req.validated = result.data;
    next();
  };
}
