import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@lastbench/shared';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../modules/auth/auth.service.js';
import { logger } from '../lib/logger.js';

// H-8: Proper singleton — exported module-level variable instead of globalThis hack
let _io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

/**
 * H-8: Type-safe singleton accessor.
 * Services that need to emit socket events import this instead of
 * reaching into globalThis with a string key.
 */
export function getIO(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return _io;
}

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // H-8: Store in module-scoped singleton, not globalThis
  _io = io;

  // H-6: Authentication middleware — validate Bearer token on handshake
  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token as string | undefined;

      if (!rawToken) {
        // Allow unauthenticated connections for read-only subscriptions,
        // but mark the socket so we can gate write operations
        socket.data.userId = null;
        return next();
      }

      const tokenHash = hashToken(rawToken);
      const session = await prisma.session.findUnique({
        where: { token: tokenHash },
        include: { user: { select: { id: true, isBanned: true } } },
      });

      if (!session || session.expiresAt < new Date() || session.user.isBanned) {
        return next(new Error('Unauthorized'));
      }

      // Attach userId to socket for use in event handlers
      socket.data.userId = session.user.id;
      next();
    } catch (err) {
      logger.error({ err }, 'Socket auth error');
      next(new Error('Internal error'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id, userId: socket.data.userId ?? 'anonymous' }, 'Socket connected');

    socket.on('post:subscribe', (postId) => {
      socket.join(`post:${postId}`);
    });

    socket.on('post:unsubscribe', (postId) => {
      socket.leave(`post:${postId}`);
    });

    socket.on('community:join', (slug) => {
      socket.join(`community:${slug}`);
    });

    socket.on('community:leave', (slug) => {
      socket.leave(`community:${slug}`);
    });

    socket.on('user:typing', (postId) => {
      // H-6: Only authenticated users can send typing events
      if (!socket.data.userId) return;

      socket.to(`post:${postId}`).emit('user:typing', {
        postId,
        username: 'Anonymous', // preserve existing behaviour; could be looked up
      });
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Socket disconnected');
    });
  });
}
