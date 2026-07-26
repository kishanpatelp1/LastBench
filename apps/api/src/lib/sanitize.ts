import sanitizeHtml from 'sanitize-html';

/**
 * Defense-in-depth XSS sanitization helper for stored user-generated content.
 * Strips potentially harmful script tags, event handler attributes, and dangerous protocols
 * while preserving standard text formatting and non-HTML expressions.
 */
export function sanitizeInput(input?: string | null): string {
  if (input === undefined || input === null) return '';
  return sanitizeHtml(input, {
    allowedTags: [], // Strip all raw HTML tags (posts and comments are plain text / formatted client-side)
    allowedAttributes: {},
  }).trim();
}
