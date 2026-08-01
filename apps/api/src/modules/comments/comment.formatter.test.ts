import { describe, it, expect } from 'vitest';
import { formatComment } from './comment.formatter.js';

function baseComment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comment_1',
    content: 'Great point!',
    isAnonymous: false,
    score: 3,
    depth: 0,
    createdAt: new Date('2026-01-01'),
    author: { id: 'user_1', username: 'jane', displayName: 'Jane', avatarUrl: null },
    votes: [],
    ...overrides,
  };
}

describe('formatComment', () => {
  it('exposes the real author when not anonymous', () => {
    const result = formatComment(baseComment());
    expect(result.author).toEqual({ id: 'user_1', username: 'jane', displayName: 'Jane', avatarUrl: null });
  });

  it('masks the author when the comment is anonymous', () => {
    const result = formatComment(baseComment({ isAnonymous: true }));
    expect(result.author).toEqual({ id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null });
  });

  it('reports userVote as null when no vote row is included', () => {
    const result = formatComment(baseComment({ votes: [] }));
    expect(result.userVote).toBeNull();
  });

  it('surfaces the current user\'s vote direction when present (regression: this used to be hardcoded null)', () => {
    const result = formatComment(baseComment({ votes: [{ type: 'DOWN' }] }));
    expect(result.userVote).toBe('DOWN');
  });

  it('reports userVote as null when the votes field is entirely absent (unauthenticated request)', () => {
    const comment = baseComment();
    delete (comment as Record<string, unknown>).votes;
    const result = formatComment(comment);
    expect(result.userVote).toBeNull();
  });
});
