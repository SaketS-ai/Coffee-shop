import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

// Express recognizes an error-handling middleware by its 4-argument signature.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    // Client-facing errors are expected and safe to return as-is. Only log
    // the 5xx ones (shouldn't normally happen for an AppError, but covers it).
    if (err.statusCode >= 500) {
      logger.error(`${err.statusCode} on ${req.method} ${req.path}: ${err.message}`);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.reason ? { reason: err.reason } : {}),
    });
  }

  // Anything else is unexpected - log the detail server-side only, and
  // never return internal error messages, stack traces, or query detail.
  logger.error(`Unhandled error on ${req.method} ${req.path}`, err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
