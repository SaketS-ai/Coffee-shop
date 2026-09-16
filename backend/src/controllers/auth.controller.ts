import { Request, Response } from 'express';
import {
  getCurrentUser,
  loginCafeStaff,
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
} from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';

export const cafeLoginHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const cafeId = body.cafe_id || body.cafeId;
  const pin = body.pin;
  const result = await loginCafeStaff({ cafeId, pin });
  res.status(200).json({ success: true, data: result });
});

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

export const verifyEmailHandler = asyncHandler(async (req: Request, res: Response) => {
  const user = await verifyEmail((req.body ?? {}).token);
  res.status(200).json({ success: true, data: user });
});

// Always the same response whether or not the email is registered - never
// reveal account existence through this endpoint (CLAUDE.md §7).
export const forgotPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  await requestPasswordReset({ email: (req.body ?? {}).email });
  res.status(200).json({
    success: true,
    data: { message: 'If an account exists for that email, a reset link has been sent.' },
  });
});

export const resetPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  await resetPassword({ token: body.token, newPassword: body.newPassword });
  res.status(200).json({ success: true, data: { message: 'Password updated. You can now sign in.' } });
});
