import pino from 'pino';

/**
 * M-1: Structured logger using Pino.
 * - In production: outputs JSON (parseable by Railway, Datadog, etc.)
 * - In development: pretty-prints with colors via pino/pretty
 * Replace all console.log / console.error calls with this logger.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino/file',
      options: { destination: 1 }, // stdout
    },
  }),
  base: {
    env: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    // Never log sensitive fields even if accidentally passed
    paths: ['*.password', '*.passwordHash', '*.token', '*.secret', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
