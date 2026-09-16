import { Router } from 'express';
import { authorizeScannerHandler, todayScannerRedemptionsHandler } from '../controllers/scanner.controller';

export const scannerRouter = Router();

scannerRouter.post('/scanner/:cafeId/authorize', authorizeScannerHandler);
scannerRouter.get('/scanner/:cafeId/today', todayScannerRedemptionsHandler);