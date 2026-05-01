import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { isProd } from '../env.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, { status: 404, code: 'NOT_FOUND' }));
}

/**
 * Express 5 forwards thrown async errors here automatically.
 * @param {unknown} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
  }

  if (err instanceof AppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    return res.status(err.status).json(body);
  }

  // Unexpected
  req.log?.error({ err }, 'unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Internal server error' : err instanceof Error ? err.message : 'Unknown error',
      ...(isProd ? {} : { stack: err instanceof Error ? err.stack : undefined }),
    },
  });
}
