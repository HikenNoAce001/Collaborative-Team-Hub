import { pino } from 'pino';
import { env, isDev, isTest } from '../env.js';

const transport = isDev
  ? {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', singleLine: false, ignore: 'pid,hostname' },
    }
  : undefined;

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      'password',
      'passwordHash',
      '*.password',
      '*.passwordHash',
      '*.email',
      'user.email',
      'body.password',
      'body.email',
    ],
    censor: '[redacted]',
  },
  ...(transport ? { transport } : {}),
});
