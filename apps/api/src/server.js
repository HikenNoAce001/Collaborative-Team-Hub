import { createServer } from 'node:http';

import { env } from './env.js';
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const app = createApp();
const httpServer = createServer(app);

// Socket.io attaches here in Phase 2.1 (real-time wiring).

httpServer.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'api listening');
});

const shutdown = (signal) => {
  logger.info({ signal }, 'shutdown initiated');
  httpServer.close(() => {
    logger.info('http server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('forced shutdown after 10s grace');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  process.exit(1);
});
