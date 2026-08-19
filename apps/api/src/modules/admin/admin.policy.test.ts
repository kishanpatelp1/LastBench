import { describe, expect, it } from 'vitest';
import { AppError } from '../../middleware/error-handler.js';
import { assertCanModerateBanAction } from './admin.policy.js';

function expectAppError(fn: () => void, statusCode: number) {
  try {
    fn();
    throw new Error('Expected AppError');
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).statusCode).toBe(statusCode);
  }
}

describe('assertCanModerateBanAction', () => {
  it('blocks self-ban and self-unban actions', () => {
    expectAppError(
      () => assertCanModerateBanAction({
        requesterId: 'user_1',
        requesterRole: 'ADMIN',
        targetUserId: 'user_1',
        targetRole: 'STUDENT',
      }),
      400,
    );
  });

  it('blocks banning administrator accounts', () => {
    expectAppError(
      () => assertCanModerateBanAction({
        requesterId: 'admin_1',
        requesterRole: 'ADMIN',
        targetUserId: 'admin_2',
        targetRole: 'ADMIN',
      }),
      403,
    );
  });

  it('blocks moderators from banning other moderators', () => {
    expectAppError(
      () => assertCanModerateBanAction({
        requesterId: 'mod_1',
        requesterRole: 'MODERATOR',
        targetUserId: 'mod_2',
        targetRole: 'MODERATOR',
      }),
      403,
    );
  });

  it('allows moderators to ban students', () => {
    expect(() => assertCanModerateBanAction({
      requesterId: 'mod_1',
      requesterRole: 'MODERATOR',
      targetUserId: 'student_1',
      targetRole: 'STUDENT',
    })).not.toThrow();
  });
});
