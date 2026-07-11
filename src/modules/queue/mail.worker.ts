import { Worker, type Job } from 'bullmq';
import { MAIL_QUEUE, type MailJob } from './queue.constants.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../mail/mail.service.js';
import { bullMqConnection } from '../../lib/redis.js';
import { transporter } from '../../lib/transporter.js';
import { env } from '../../config/env.config.js';
import { logger } from '../../utils/logger.js';

// Top-level processor — no nesting. Dispatches on the job's `kind`.
// TypeScript narrows job.data by the `kind` discriminant.
async function processMailJob(job: Job<MailJob>): Promise<void> {
  const data = job.data;
  switch (data.kind) {
    case 'email-verification':
      await sendVerificationEmail(transporter, env.MAIL_FROM, data.to, data.link);
      break;
    case 'password-reset':
      await sendPasswordResetEmail(transporter, env.MAIL_FROM, data.to, data.link);
      break;
  }
}

// Top-level event handlers (visibility into failures).
function onFailed(job: Job<MailJob> | undefined, err: Error): void {
  logger.error(`Mail job ${job?.id ?? 'unknown'} (${job?.data.kind}) failed:`, {
    message: err.message,
  });
}

function onError(err: Error): void {
  logger.error('Mail worker error:', { message: err.message });
}

export function startMailWorker(): Worker<MailJob> {
  const worker = new Worker<MailJob>(MAIL_QUEUE, processMailJob, {
    connection: bullMqConnection,
  });
  worker.on('failed', onFailed);
  worker.on('error', onError);
  return worker;
}
