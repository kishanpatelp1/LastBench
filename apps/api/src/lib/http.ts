import type { Request } from 'express';

/**
 * M-4: Normalize the request path before building the rate-limit key.
 * Without normalization, /api/posts and /api/posts/ count as different buckets,
 * trivially bypassing limits by adding a trailing slash or query params.
 *
 * Pulled out of middleware/rate-limit.ts (which pulls in Redis/env at import
 * time) so this pure string logic can be unit-tested in isolation.
 */
export function normalizePath(req: Pick<Request, 'route' | 'path'>): string {
  // Use the matched route pattern when available (e.g., "/posts/:id")
  // Fall back to the raw path with trailing slash stripped and query params removed
  const routePath = (req.route as { path?: string } | undefined)?.path;
  if (routePath) return routePath;
  return req.path.replace(/\/+$/, '').toLowerCase() || '/';
}
