import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAuthToken } from '../utils/jwt';

const BEARER_PREFIX = 'Bearer ';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return next(new AppError(401, 'Missing or invalid Authorization header.', 'MISSING_TOKEN'));
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return next(new AppError(401, 'Missing or invalid Authorization header.', 'MISSING_TOKEN'));
  }

  try {
    const payload = verifyAuthToken(token);
    req.user = { sub: payload.sub, role: payload.role, cafeId: payload.cafeId };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token.', 'INVALID_TOKEN'));
  }
}
