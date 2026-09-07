import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth once the JWT has been verified. */
      user?: {
        sub: string;
        role: UserRole;
      };
    }
  }
}

export {};
