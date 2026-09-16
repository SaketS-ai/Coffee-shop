import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { authorizeScanner, getTodayRedemptions, requireScannerDevice } from '../services/scanner.service';
import { verifyAuthToken } from '../utils/jwt';

export const authorizeScannerHandler = asyncHandler(async (req: Request, res: Response) => {
  const { pin, label } = req.body ?? {};
  if (typeof pin !== 'string') throw new AppError(400, 'PIN is required.', 'INVALID_PIN');
  const result = await authorizeScanner(req.params.cafeId, pin, typeof label === 'string' ? label : undefined);
  res.status(200).json(result);
});

export const todayScannerRedemptionsHandler = asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers['x-scanner-token'];
  const authHeader = req.headers.authorization;

  if (typeof token === 'string' && token.trim().length > 0) {
    await requireScannerDevice(req.params.cafeId, token);
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    const rawJwt = authHeader.slice('Bearer '.length).trim();
    const payload = verifyAuthToken(rawJwt);
    if (payload.role === 'ADMIN') {
      // Admin authorized for all cafes
    } else if (payload.role === 'BARISTA') {
      if (payload.cafeId && payload.cafeId !== req.params.cafeId) {
        throw new AppError(403, 'Unauthorized to view another cafe redemption activity.', 'WRONG_CAFE');
      }
    } else {
      throw new AppError(403, 'Insufficient permissions for cafe operations.', 'FORBIDDEN');
    }
  } else {
    throw new AppError(401, 'Scanner authorization is required.', 'MISSING_SCANNER_TOKEN');
  }

  const rows = await getTodayRedemptions(req.params.cafeId);
  res.status(200).json({ redemptions: rows });
});