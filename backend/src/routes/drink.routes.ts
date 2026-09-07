import { Router } from 'express';
import {
  createDrinkHandler,
  deactivateDrinkHandler,
  getDrink,
  listDrinksForCafe,
  updateDrinkHandler,
} from '../controllers/drink.controller';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

export const drinkRouter = Router();

// Public.
drinkRouter.get('/cafes/:cafeId/drinks', listDrinksForCafe);
drinkRouter.get('/drinks/:id', getDrink);

// Admin-only.
drinkRouter.post('/cafes/:cafeId/drinks', requireAuth, requireRole('ADMIN'), createDrinkHandler);
drinkRouter.put('/drinks/:id', requireAuth, requireRole('ADMIN'), updateDrinkHandler);
drinkRouter.delete('/drinks/:id', requireAuth, requireRole('ADMIN'), deactivateDrinkHandler);
