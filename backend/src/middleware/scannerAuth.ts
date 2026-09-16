import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { requireScannerDevice } from '../services/scanner.service';

export async function requireScannerAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = req.headers['x-scanner-token'];
    if (typeof token !== 'string' || !req.body?.cafe_id) throw new AppError(401, 'Scanner authorization is required.', 'MISSING_SCANNER_TOKEN');
    const device = await requireScannerDevice(req.body.cafe_id, token);
    req.scanner = { cafeId: device.cafe_id, deviceId: device.id };
    next();
  } catch (error) {
    next(error);
  }
}