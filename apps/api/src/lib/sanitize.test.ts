import { describe, it, expect, vi } from 'vitest';
import { sanitizeInput } from './sanitize.js';

vi.mock('sanitize-html', () => ({
  default: (str: string) => str.replace(/<[^>]*>?/gm, '').trim(),
}));

describe('sanitizeInput', () => {
  it('strips script tags entirely', () => {
    expect(sanitizeInput('<script>alert(1)</script>hello')).toBe('alert(1)hello');
  });

  it('strips all HTML tags, keeping only text content', () => {
    expect(sanitizeInput('<b>bold</b> and <i>italic</i>')).toBe('bold and italic');
  });

  it('leaves plain text untouched', () => {
    expect(sanitizeInput('Just a normal comment about placements.')).toBe(
      'Just a normal comment about placements.',
    );
  });

  it('trims leading/trailing whitespace', () => {
    expect(sanitizeInput('  padded text  ')).toBe('padded text');
  });

  it('returns an empty string for null', () => {
    expect(sanitizeInput(null)).toBe('');
  });

  it('returns an empty string for undefined', () => {
    expect(sanitizeInput(undefined)).toBe('');
  });

  it('returns an empty string for an empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
