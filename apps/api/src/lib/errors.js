/**
 * AppError — every controlled failure throws one of these.
 * The error middleware turns them into the standard envelope (CLAUDE.md §5).
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: unknown }} [opts]
   */
  constructor(message, { status = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

export const BadRequest = (message, details) =>
  new AppError(message, { status: 400, code: 'BAD_REQUEST', details });

export const Unauthorized = (message = 'Unauthorized') =>
  new AppError(message, { status: 401, code: 'UNAUTHORIZED' });

export const Forbidden = (message = 'Forbidden') =>
  new AppError(message, { status: 403, code: 'FORBIDDEN' });

export const NotFound = (message = 'Not found') =>
  new AppError(message, { status: 404, code: 'NOT_FOUND' });

export const Conflict = (message, details) =>
  new AppError(message, { status: 409, code: 'CONFLICT', details });

export const Gone = (message = 'Gone') =>
  new AppError(message, { status: 410, code: 'GONE' });

export const Validation = (message = 'Validation failed', details) =>
  new AppError(message, { status: 422, code: 'VALIDATION_ERROR', details });
