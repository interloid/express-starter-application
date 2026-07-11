import { Queue } from 'bullmq';
import { MAIL_QUEUE } from './queue.constants.js';
import { bullMqConnection } from '../../lib/redis.js';

export const mailQueue = new Queue(MAIL_QUEUE, { connection: bullMqConnection });
