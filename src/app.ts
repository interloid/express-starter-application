import express from 'express';
import { correlationIdMiddleware } from './common/middlewares/correlation-id.middleware.js';
import { healthRouter } from './modules/observability/health/health.routes.js';
import { setupSwagger } from './config/swagger.config.js';
import { setupSecurity } from './security/security.js';
import {
  globalErrorHandler,
  notFoundHandler,
} from './common/middlewares/error-handler.middleware.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { env } from './config/env.config.js';
import { uploadRouter } from './modules/upload/upload.routes.js';

const app = express();

app.use(express.json());
app.use(correlationIdMiddleware);

const { csrf } = setupSecurity(app, {
  isLocal: env.APP_ENV === 'local',
  isProduction: env.NODE_ENV === 'production',
  corsOrigins: (env.CORS_ORIGINS ?? '').split(',').filter(Boolean),
  csrfEnabled: env.CSRF_ENABLED,
  csrfSecret: env.CSRF_SECRET ?? '',
});
app.get('/csrf-token', (req, res) => {
  res.json({ token: csrf.generateToken(req, res) });
});

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);

setupSwagger(app);

app.use(notFoundHandler);
app.use(globalErrorHandler);
export { app };
