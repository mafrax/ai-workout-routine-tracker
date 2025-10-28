import { Router, Request, Response } from 'express';
import { HealthResponse } from '../types';

const router = Router();

router.get('/', (_req: Request, res: Response<HealthResponse>) => {
  const healthResponse: HealthResponse = {
    status: 'UP',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  };

  res.json(healthResponse);
});

export default router;