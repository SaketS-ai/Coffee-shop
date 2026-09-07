import { Request, Response } from 'express';
import { getCurrentUser, loginUser, registerUser } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await registerUser(req.body ?? {});
  res.status(201).json({ success: true, data: { user, token } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { user, token } = await loginUser(req.body ?? {});
  res.status(200).json({ success: true, data: { user, token } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  // req.user is guaranteed by the requireAuth middleware in front of this route.
  const user = await getCurrentUser(req.user!.sub);
  res.status(200).json({ success: true, data: user });
});
