import type { Role } from '@prisma/client';
import { AppError } from '../../middleware/error-handler.js';

export function assertCanModerateBanAction(input: {
  requesterId?: string;
  requesterRole?: string;
  targetUserId: string;
  targetRole: Role;
}) {
  if (input.targetUserId === input.requesterId) {
    throw new AppError(400, 'You cannot ban or unban yourself');
  }

  if (input.targetRole === 'ADMIN') {
    throw new AppError(403, 'Administrator accounts cannot be banned');
  }

  if (input.requesterRole === 'MODERATOR' && input.targetRole === 'MODERATOR') {
    throw new AppError(403, 'Moderators cannot ban or unban other moderators');
  }
}
