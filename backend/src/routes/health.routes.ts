import { Router } from 'express';
import { getHealth, getLiveness, getReadiness } from '../controllers/health.controller';

export const healthRouter = Router();

// Backward-compatible health check
healthRouter.get('/health', getHealth);

// ALB Target Group liveness check (does not hit database)
healthRouter.get('/health/live', getLiveness);

// Deployment readiness check (validates database connectivity)
healthRouter.get('/health/ready', getReadiness);
