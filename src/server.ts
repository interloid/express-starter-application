import { app } from './app.js';
import { env } from './config/env.config.js';
import { registerShutdownHandlers } from './lib/graceful-shutdown.js';
import { redisClient } from './lib/redis.js';
import { startMailWorker } from './modules/queue/mail.worker.js';
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
  const worker = startMailWorker();

  await logger.init(loggerOpts);
  try {
    await redisClient.ping();
    logger.info('Redis verified and ready');
  } catch (err) {
    let message: string | undefined;
    if (err instanceof Error) {
      message = err.message;
    }
    logger.error('Redis failed to respond to PING', { message });
    process.exit(1);
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running smoothly in [${env.APP_ENV}] mode on port ${env.PORT}`);
  });
  registerShutdownHandlers({ server, worker, redis: redisClient });
}

bootstrap().catch((err: unknown) => {
  console.error('Application failed to bootstrap execution pipeline:', err);
  process.exit(1);
});
