import { Router } from 'express';
import { adminRouter } from './admin.routes';
import { authRouter } from './auth.routes';
import { cafeRouter } from './cafe.routes';
import { drinkRouter } from './drink.routes';
import { healthRouter } from './health.routes';
import { membershipRouter } from './membership.routes';
import { redemptionRouter } from './redemption.routes';
import { reviewRouter } from './review.routes';
import { profileRouter } from './profile.routes';
import { scannerRouter } from './scanner.routes';
import { uploadRouter } from './upload.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(authRouter);
apiRouter.use(cafeRouter);
apiRouter.use(drinkRouter);
apiRouter.use(membershipRouter);
apiRouter.use(redemptionRouter);
apiRouter.use(reviewRouter);
apiRouter.use(profileRouter);
apiRouter.use(scannerRouter);
apiRouter.use(adminRouter);
apiRouter.use(uploadRouter);
