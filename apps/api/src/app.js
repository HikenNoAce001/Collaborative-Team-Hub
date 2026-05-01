import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';

import { env } from './env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/router.js';
import { usersRouter } from './modules/users/router.js';
import { workspacesRouter } from './modules/workspaces/router.js';
import { invitationsRouter } from './modules/invitations/router.js';
import { workspaceGoalsRouter, goalsRouter } from './modules/goals/router.js';
import { milestonesRouter } from './modules/milestones/router.js';
import {
  workspaceActionItemsRouter,
  actionItemsRouter,
} from './modules/action-items/router.js';
import {
  workspaceAnnouncementsRouter,
  announcementsRouter,
} from './modules/announcements/router.js';
import { workspaceAuditRouter } from './modules/audit/router.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      name: pkg.name,
      version: pkg.version,
      env: env.NODE_ENV,
      uptimeSec: Math.round(process.uptime()),
    });
  });

  app.use('/auth', authRouter);
  app.use('/users', usersRouter);
  app.use('/workspaces/:id/goals', workspaceGoalsRouter);
  app.use('/workspaces/:id/action-items', workspaceActionItemsRouter);
  app.use('/workspaces/:id/announcements', workspaceAnnouncementsRouter);
  app.use('/workspaces/:id/audit-logs', workspaceAuditRouter);
  app.use('/workspaces', workspacesRouter);
  app.use('/invitations', invitationsRouter);
  app.use('/goals', goalsRouter);
  app.use('/milestones', milestonesRouter);
  app.use('/action-items', actionItemsRouter);
  app.use('/announcements', announcementsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
