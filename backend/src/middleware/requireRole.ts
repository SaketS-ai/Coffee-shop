import { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AppError } from '../utils/AppError';

/**
 * Reusable role guard, e.g. router.get('/admin/x', requireAuth,
 * requireRole('ADMIN'), handler). Must run after requireAuth, since it reads
 * req.user. Used by the redemption ("BARISTA","ADMIN"), admin, and
 * membership admin routes.
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
