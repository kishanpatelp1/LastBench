import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { AppError } from './error-handler.js';

// Extend Express Request to carry validated data
declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
    }
  }
}

/**
 * H-7: Format Zod errors into human-readable field messages.
 * Previously used JSON.stringify(errors) which leaked internal schema structure
 * to API consumers. Now returns clean { field: "message" } format.
 */
function formatZodErrors(error: ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.') || '_root';
    if (!formatted[field]) {
      formatted[field] = issue.message;
    }
  }
  return formatted;
}

export function validate(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : req.query;
    const result = schema.safeParse(data);

    if (!result.success) {
      // H-7: Return structured human-readable errors, not raw JSON.stringify
      const errors = formatZodErrors(result.error);
      const firstMessage = Object.values(errors)[0] ?? 'Validation failed';
      const err = new AppError(400, firstMessage, 'VALIDATION_ERROR');
      (err as AppError & { errors: Record<string, string> }).errors = errors;
      next(err);
      return;
    }

    req.validated = result.data;
    next();
  };
}
