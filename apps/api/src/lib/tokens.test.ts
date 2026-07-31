import { describe, it, expect } from 'vitest';
import { hashToken, generateSessionToken, generateSecureToken } from './tokens.js';

describe('hashToken', () => {
  it('is deterministic — the same input always hashes the same way', () => {
    expect(hashToken('my-raw-token')).toBe(hashToken('my-raw-token'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('never returns the raw input (defense against storing plaintext tokens)', () => {
    expect(hashToken('super-secret-session-token')).not.toBe('super-secret-session-token');
  });

  it('produces a 64-character lowercase hex string (SHA-256)', () => {
    const hash = hashToken('anything');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateSessionToken', () => {
  it('generates a non-empty string', () => {
    expect(generateSessionToken().length).toBeGreaterThan(0);
  });

  it('generates unique tokens across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSessionToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('generateSecureToken', () => {
  it('generates unique tokens across calls', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateSecureToken()));
    expect(tokens.size).toBe(50);
  });

  it('is shorter than a session token by design (one-shot link vs long-lived session)', () => {
    expect(generateSecureToken().length).toBeLessThan(generateSessionToken().length);
  });
});
