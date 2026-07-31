import { describe, it, expect } from 'vitest';
import { normalizePath } from './http.js';

describe('normalizePath', () => {
  it('prefers the matched Express route pattern over the raw path', () => {
    const req = { route: { path: '/posts/:id' }, path: '/posts/abc123' } as never;
    expect(normalizePath(req)).toBe('/posts/:id');
  });

  it('strips a trailing slash from the raw path when no route pattern is available', () => {
    const req = { route: undefined, path: '/api/posts/' } as never;
    expect(normalizePath(req)).toBe('/api/posts');
  });

  it('lowercases the raw path so casing cannot bypass the rate-limit bucket', () => {
    const req = { route: undefined, path: '/API/Posts' } as never;
    expect(normalizePath(req)).toBe('/api/posts');
  });

  it('treats the root path as "/" rather than an empty string', () => {
    const req = { route: undefined, path: '/' } as never;
    expect(normalizePath(req)).toBe('/');
  });

  it('collapses multiple trailing slashes', () => {
    const req = { route: undefined, path: '/api/posts///' } as never;
    expect(normalizePath(req)).toBe('/api/posts');
  });
});
