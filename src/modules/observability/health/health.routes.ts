import { Router } from 'express';
import { createHealthService } from './health.service.js';
import { createHealthController } from './health.controller.js';
import { registerHealthDocs } from './health.docs.js';

const healthService = createHealthService();
const controller = createHealthController(healthService);
registerHealthDocs();
export const healthRouter = Router();

healthRouter.get('/live', controller.liveness);

healthRouter.get('/ready', controller.readiness);
