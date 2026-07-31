import { describe, it, expect } from 'vitest';
import { formatPost } from './post.formatter.js';

function basePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post_1',
    title: 'Hello',
    content: 'Body text',
    type: 'TEXT',
    isAnonymous: false,
    mediaUrls: [],
    tags: [],
    score: 5,
    commentCount: 2,
    isPinned: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    author: { id: 'user_1', username: 'jane', displayName: 'Jane', avatarUrl: null },
    community: { id: 'c_1', name: 'IITM', slug: 'iitm', avatarUrl: null },
    poll: null,
    votes: [],
    ...overrides,
  };
}

describe('formatPost', () => {
  it('exposes the real author when the post is not anonymous', () => {
    const result = formatPost(basePost());
    expect(result.author).toEqual({ id: 'user_1', username: 'jane', displayName: 'Jane', avatarUrl: null });
  });

  it('masks the author entirely when the post is anonymous', () => {
    const result = formatPost(basePost({ isAnonymous: true }));
    expect(result.author).toEqual({ id: 'anonymous', username: 'Anonymous', displayName: 'Anonymous', avatarUrl: null });
  });

  it('reports userVote as null when the votes array is empty', () => {
    const result = formatPost(basePost({ votes: [] }));
    expect(result.userVote).toBeNull();
  });

  it('surfaces the current user\'s vote direction when present', () => {
    const result = formatPost(basePost({ votes: [{ type: 'UP' }] }));
    expect(result.userVote).toBe('UP');
  });

  it('returns poll: null when there is no poll', () => {
    const result = formatPost(basePost({ poll: null }));
    expect(result.poll).toBeNull();
  });

  it('computes poll percentages correctly across options', () => {
    const post = basePost({
      poll: {
        id: 'poll_1',
        expiresAt: null,
        options: [
          { id: 'opt_a', text: 'A', _count: { votes: 3 }, votes: [] },
          { id: 'opt_b', text: 'B', _count: { votes: 1 }, votes: [] },
        ],
      },
    });
    const result = formatPost(post);
    expect(result.poll?.totalVotes).toBe(4);
    expect(result.poll?.options?.[0]?.percentage).toBe(75);
    expect(result.poll?.options?.[1]?.percentage).toBe(25);
  });

  it('reports 0% for every option when a poll has no votes yet (avoids divide-by-zero)', () => {
    const post = basePost({
      poll: {
        id: 'poll_1',
        expiresAt: null,
        options: [{ id: 'opt_a', text: 'A', _count: { votes: 0 }, votes: [] }],
      },
    });
    const result = formatPost(post);
    expect(result.poll?.options?.[0]?.percentage).toBe(0);
  });

  it('identifies which option the current user voted for', () => {
    const post = basePost({
      poll: {
        id: 'poll_1',
        expiresAt: null,
        options: [
          { id: 'opt_a', text: 'A', _count: { votes: 1 }, votes: [] },
          { id: 'opt_b', text: 'B', _count: { votes: 1 }, votes: [{ id: 'v1' }] },
        ],
      },
    });
    const result = formatPost(post);
    expect(result.poll?.userVotedOptionId).toBe('opt_b');
  });
});
