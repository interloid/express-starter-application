import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.config.js';

// export interface SmtpConfig {
//   host: string;
//   port: number;
//   secure: boolean;
//   user: string;
//   pass: string;
//   from: string;
// }

// export function createMailTransporter(config: SmtpConfig): Transporter {
//   return nodemailer.createTransport({
//     host: config.host,
//     port: config.port,
//     secure: config.secure,
//     auth: { user: config.user, pass: config.pass },
//   });
// }
export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465 ? true : false,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
});
