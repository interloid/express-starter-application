import { type Request, type Response, type NextFunction } from 'express';
import type { HealthService } from './health.service.js';

export function createHealthController(healthService: HealthService) {
  const liveness = (req: Request, res: Response) => {
    res.status(200).json(healthService.getLiveness());
  };

  const readiness = (req: Request, res: Response, next: NextFunction) => {
    try {
      const { healthy, body } = healthService.getReadiness();
      res.status(healthy ? 200 : 503).json(body);
    } catch (err) {
      next(err);
    }
  };

  return { liveness, readiness };
}
