import { describe, it, expect } from 'vitest';
import { createReportSchema } from '@lastbench/shared';

describe('createReportSchema', () => {
  it('validates a valid post report', () => {
    const result = createReportSchema.safeParse({
      postId: 'post_123',
      reason: 'spam',
      details: 'Spamming telegram links',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.postId).toBe('post_123');
      expect(result.data.reason).toBe('spam');
    }
  });

  it('validates a valid comment report', () => {
    const result = createReportSchema.safeParse({
      commentId: 'comment_456',
      reason: 'harassment',
    });
    expect(result.success).toBe(true);
  });

  it('validates a valid user report', () => {
    const result = createReportSchema.safeParse({
      userId: 'user_789',
      reason: 'doxxing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects reports with zero targets', () => {
    const result = createReportSchema.safeParse({
      reason: 'spam',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reports with multiple targets simultaneously', () => {
    const result = createReportSchema.safeParse({
      postId: 'post_123',
      commentId: 'comment_456',
      reason: 'spam',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid reason values without silent coercion', () => {
    const result = createReportSchema.safeParse({
      postId: 'post_123',
      reason: 'not_a_real_reason',
    });
    expect(result.success).toBe(false);
  });
});
