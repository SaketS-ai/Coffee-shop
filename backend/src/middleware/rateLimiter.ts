import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/**
 * In-memory rate limiter for public authentication endpoints.
 * Protects against brute-force credential stuffing and password reset spam.
 */
export const authLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication requests from this IP. Please try again later.',
    reason: 'RATE_LIMIT_EXCEEDED',
  },
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
