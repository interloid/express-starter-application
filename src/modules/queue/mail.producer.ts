import { mailQueue } from './mail.queue.js';

const RETRY_OPTS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: true,
  removeOnFail: 100,
};

export async function enqueueVerificationEmail(to: string, link: string): Promise<void> {
  await mailQueue.add('email-verification', { kind: 'email-verification', to, link }, RETRY_OPTS);
}

export async function enqueuePasswordResetEmail(to: string, link: string): Promise<void> {
  await mailQueue.add('password-reset', { kind: 'password-reset', to, link }, RETRY_OPTS);
}
