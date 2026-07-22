import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { setupSocketHandlers } from './socket/index.js';
import { startWorkers } from './workers/index.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';
import { logger } from './lib/logger.js';

async function main() {
  const app = createApp();
  const httpServer = createServer(app);

  // Socket.IO
  const io = new SocketServer(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  setupSocketHandlers(io);

  // Background workers
  startWorkers();

  httpServer.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `🟣 LastBench API listening`,
    );
  });

  // ─── M-2: Graceful Shutdown ───────────────────────────────────────────────
  // When Railway (or any orchestrator) sends SIGTERM, we:
  //   1. Stop accepting new HTTP connections
  //   2. Wait for in-flight requests to complete (30s max)
  //   3. Close Socket.IO gracefully
  //   4. Disconnect from PostgreSQL and Redis
  // Without this, active requests are killed mid-flight and DB connections leak.

  let isShuttingDown = false;

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // Stop the HTTP server from accepting new connections
    httpServer.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close Socket.IO
        await new Promise<void>((resolve) => io.close(() => resolve()));
        logger.info('Socket.IO closed');

        // Disconnect Prisma
        await prisma.$disconnect();
        logger.info('Prisma disconnected');

        // Quit Redis
        redis.quit();
        logger.info('Redis disconnected');

        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force exit if graceful shutdown takes longer than 30s
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, 30_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors — log them before crashing
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
