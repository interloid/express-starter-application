import express from 'express';
import { correlationIdMiddleware } from './middlewares/correlation-id.middleware.js';
import { healthRouter } from './modules/observability/health/health.routes.js';
import { setupSwagger } from './config/swagger.config.js';
import { setupSecurity } from './security/security.js';

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

const { csrf } = setupSecurity(app, {
  isLocal: process.env.APP_ENV === 'local',
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  csrfEnabled: process.env.CSRF_ENABLED === 'true',
  csrfSecret: process.env.CSRF_SECRET ?? '',
});
app.get('/csrf-token', (req, res) => {
  res.json({ token: csrf.generateToken(req, res) });
});

app.use('/health', healthRouter);

setupSwagger(app);

export { app };
