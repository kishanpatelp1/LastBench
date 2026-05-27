import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@lastbench/shared';

export function setupSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

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
      socket.to(`post:${postId}`).emit('user:typing', {
        postId,
        username: 'Anonymous',
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Export io for use in services
  (globalThis as Record<string, unknown>).__socketIO = io;
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents> | null {
  return (globalThis as Record<string, unknown>).__socketIO as Server<ClientToServerEvents, ServerToClientEvents> ?? null;
}
