import { createServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { setupSocketHandlers } from './socket/index.js';
import { startWorkers } from './workers/index.js';

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
    console.log(`
  ╔══════════════════════════════════════════╗
  ║           🟣 LastBench API Server            ║
  ║──────────────────────────────────────────║
  ║  HTTP:   http://localhost:${env.PORT}          ║
  ║  WS:     ws://localhost:${env.PORT}            ║
  ║  Env:    ${env.NODE_ENV.padEnd(28)}║
  ╚══════════════════════════════════════════╝
    `);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
