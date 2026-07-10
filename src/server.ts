import { app } from './app.js';
import { env } from './config/env.config.js';
import { logger, type LoggerOptions } from './utils/logger.js';

async function bootstrap(): Promise<void> {
  const loggerOpts: LoggerOptions = {
    serviceName: 'express-starter-api',
    newRelic: env.APP_ENV !== 'local',
  };

  if (env.APP_ENV === 'production') {
    loggerOpts.file = {
      directory: './logs',
      alsoStdout: true,
    };
  }

  await logger.init(loggerOpts);

  app.listen(env.PORT, () => {
    logger.info(`🚀 Server running smoothly in [${env.APP_ENV}] mode on port ${env.PORT}`);
  });
}

bootstrap().catch((err: unknown) => {
  console.error('❌ Application failed to bootstrap execution pipeline:', err);
  process.exit(1);
});
