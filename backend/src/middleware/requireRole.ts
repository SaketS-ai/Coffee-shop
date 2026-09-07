import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Reusable role guard for future endpoints, e.g. router.get('/admin/x',
 * requireAuth, requireRole('ADMIN'), handler). Must run after requireAuth,
 * since it reads req.user. Not wired to any route yet in this phase.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required.', 'MISSING_TOKEN'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(403, 'Insufficient role.', 'INSUFFICIENT_ROLE'));
    }
    next();
  };
}
